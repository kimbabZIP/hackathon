from __future__ import annotations

import hashlib
import os
import re
import secrets
import sqlite3
import unicodedata
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, Request, Response, status
from pwdlib import PasswordHash

from assignment_grader.database import AppDatabase, database
from assignment_grader.schemas import AuthUser, UserLoginRequest, UserRegisterRequest

SESSION_COOKIE_NAME = "scholarly_session"
SESSION_LIFETIME = timedelta(days=7)
MAX_FAILED_LOGINS = 5
LOCK_DURATION = timedelta(minutes=15)
LOGIN_ID_PATTERN = re.compile(r"^[a-z0-9._@-]+$")

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("not-a-real-user-password")


class AuthConflictError(ValueError):
    pass


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_login_id(value: str) -> str:
    return unicodedata.normalize("NFKC", value).strip().casefold()


def _normalize_email(value: str | None) -> str | None:
    normalized = unicodedata.normalize("NFKC", value or "").strip().casefold()
    return normalized or None


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthStore:
    def __init__(self, app_database: AppDatabase = database) -> None:
        self.database = app_database

    @staticmethod
    def _public_user(row: sqlite3.Row) -> AuthUser:
        return AuthUser(
            id=row["id"],
            login_id=row["login_id"],
            display_name=row["display_name"],
            email=row["email"],
            role=row["role"],
            status=row["status"],
            created_at=row["created_at"],
        )

    def register(self, request: UserRegisterRequest) -> AuthUser:
        self.database.ensure_schema()
        login_id_normalized = _normalize_login_id(request.login_id)
        if not 3 <= len(login_id_normalized) <= 100 or not LOGIN_ID_PATTERN.fullmatch(login_id_normalized):
            raise ValueError("아이디는 영문 소문자, 숫자, 점, 밑줄, 하이픈, @를 사용해 3자 이상 입력해 주세요.")
        display_name = request.display_name.strip()
        if not display_name:
            raise ValueError("표시 이름을 입력해 주세요.")
        now = _utc_now().isoformat()
        user_id = f"usr-{uuid4().hex}"
        try:
            with self.database.connect() as connection:
                connection.execute(
                    """
                    INSERT INTO users (
                        id, login_id, login_id_normalized, password_hash,
                        display_name, email, email_normalized, role, status,
                        password_changed_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'active', ?, ?, ?)
                    """,
                    (
                        user_id,
                        request.login_id.strip(),
                        login_id_normalized,
                        password_hash.hash(request.password),
                        display_name,
                        request.email.strip() if request.email else None,
                        _normalize_email(request.email),
                        now,
                        now,
                        now,
                    ),
                )
                connection.execute(
                    "INSERT INTO user_settings (user_id, updated_at) VALUES (?, ?)",
                    (user_id, now),
                )
                row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        except sqlite3.IntegrityError as exc:
            raise AuthConflictError("이미 사용 중인 아이디 또는 이메일입니다.") from exc
        if row is None:
            raise RuntimeError("회원 생성 후 데이터를 찾지 못했습니다.")
        return self._public_user(row)

    def _record_event(
        self,
        connection: sqlite3.Connection,
        *,
        event_type: str,
        login_id: str,
        user_id: str | None,
        ip_address: str | None,
        user_agent: str | None,
    ) -> None:
        connection.execute(
            """
            INSERT INTO auth_events (
                id, user_id, login_id_attempted, event_type,
                ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"evt-{uuid4().hex}",
                user_id,
                login_id,
                event_type,
                ip_address,
                user_agent,
                _utc_now().isoformat(),
            ),
        )

    def authenticate(
        self,
        request: UserLoginRequest,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> AuthUser | None:
        self.database.ensure_schema()
        normalized = _normalize_login_id(request.login_id)
        now = _utc_now()
        with self.database.connect() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE login_id_normalized = ? AND deleted_at IS NULL",
                (normalized,),
            ).fetchone()
            if row is None:
                password_hash.verify(request.password, DUMMY_PASSWORD_HASH)
                self._record_event(
                    connection,
                    event_type="login_failure",
                    login_id=normalized,
                    user_id=None,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return None

            locked_until = datetime.fromisoformat(row["locked_until"]) if row["locked_until"] else None
            if row["status"] not in {"active", "locked"} or (locked_until and locked_until > now):
                self._record_event(
                    connection,
                    event_type="login_failure",
                    login_id=normalized,
                    user_id=row["id"],
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return None

            if not password_hash.verify(request.password, row["password_hash"]):
                failures = row["failed_login_count"] + 1
                next_locked_until = None
                next_status = "active"
                if failures >= MAX_FAILED_LOGINS:
                    next_locked_until = (now + LOCK_DURATION).isoformat()
                    next_status = "locked"
                connection.execute(
                    """
                    UPDATE users
                    SET failed_login_count = ?, locked_until = ?, status = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (failures, next_locked_until, next_status, now.isoformat(), row["id"]),
                )
                self._record_event(
                    connection,
                    event_type="login_failure",
                    login_id=normalized,
                    user_id=row["id"],
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return None

            connection.execute(
                """
                UPDATE users
                SET failed_login_count = 0, locked_until = NULL,
                    status = 'active', last_login_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (now.isoformat(), now.isoformat(), row["id"]),
            )
            self._record_event(
                connection,
                event_type="login_success",
                login_id=normalized,
                user_id=row["id"],
                ip_address=ip_address,
                user_agent=user_agent,
            )
            updated = connection.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
        return self._public_user(updated)

    def create_session(
        self,
        user_id: str,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> str:
        self.database.ensure_schema()
        token = secrets.token_urlsafe(32)
        now = _utc_now()
        with self.database.connect() as connection:
            connection.execute(
                """
                INSERT INTO user_sessions (
                    id, user_id, token_hash, user_agent, ip_address,
                    created_at, last_seen_at, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"ses-{uuid4().hex}",
                    user_id,
                    _token_hash(token),
                    user_agent,
                    ip_address,
                    now.isoformat(),
                    now.isoformat(),
                    (now + SESSION_LIFETIME).isoformat(),
                ),
            )
        return token

    def user_for_session(self, token: str) -> AuthUser | None:
        self.database.ensure_schema()
        now = _utc_now().isoformat()
        with self.database.connect() as connection:
            row = connection.execute(
                """
                SELECT users.*, user_sessions.id AS session_id
                FROM user_sessions
                JOIN users ON users.id = user_sessions.user_id
                WHERE user_sessions.token_hash = ?
                  AND user_sessions.revoked_at IS NULL
                  AND user_sessions.expires_at > ?
                  AND users.status = 'active'
                  AND users.deleted_at IS NULL
                """,
                (_token_hash(token), now),
            ).fetchone()
            if row is None:
                return None
            connection.execute(
                "UPDATE user_sessions SET last_seen_at = ? WHERE id = ?",
                (now, row["session_id"]),
            )
        return self._public_user(row)

    def revoke_session(self, token: str) -> None:
        self.database.ensure_schema()
        with self.database.connect() as connection:
            connection.execute(
                "UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
                (_utc_now().isoformat(), _token_hash(token)),
            )


auth_store = AuthStore()


def set_session_cookie(response: Response, token: str) -> None:
    secure = os.getenv("SESSION_COOKIE_SECURE", "").strip().lower() in {"1", "true", "yes"}
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite="lax")


def get_optional_user(request: Request) -> AuthUser | None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    return auth_store.user_for_session(token) if token else None


def get_current_user(request: Request) -> AuthUser:
    user = get_optional_user(request)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    return user
