from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "scholarly_affection.db"


class AppDatabase:
    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self._lock = threading.Lock()
        self._initialized = False

    def connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def ensure_schema(self) -> None:
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return
            statements = [
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    login_id TEXT NOT NULL,
                    login_id_normalized TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    email TEXT,
                    email_normalized TEXT,
                    email_verified_at TEXT,
                    role TEXT NOT NULL DEFAULT 'student'
                        CHECK (role IN ('student', 'admin')),
                    status TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('pending', 'active', 'locked', 'suspended', 'deleted')),
                    failed_login_count INTEGER NOT NULL DEFAULT 0,
                    locked_until TEXT,
                    password_changed_at TEXT NOT NULL,
                    last_login_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT
                )
                """,
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_normalized
                ON users(email_normalized)
                WHERE email_normalized IS NOT NULL
                """,
                """
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    user_agent TEXT,
                    ip_address TEXT,
                    created_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires
                ON user_sessions(user_id, expires_at)
                """,
                """
                CREATE TABLE IF NOT EXISTS auth_events (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    login_id_attempted TEXT,
                    event_type TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_auth_events_user_created
                ON auth_events(user_id, created_at DESC)
                """,
                """
                CREATE TABLE IF NOT EXISTS professor_templates (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    default_name TEXT,
                    default_age INTEGER,
                    default_department TEXT,
                    default_specialty TEXT,
                    default_personality_type TEXT,
                    default_quote TEXT,
                    default_difficulty INTEGER,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS professors (
                    id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    template_id TEXT,
                    name TEXT NOT NULL,
                    age INTEGER CHECK (age BETWEEN 25 AND 100),
                    department TEXT NOT NULL,
                    lab_name TEXT,
                    specialty TEXT NOT NULL,
                    personality_type TEXT,
                    traits TEXT,
                    representative_quote TEXT,
                    difficulty INTEGER NOT NULL DEFAULT 3
                        CHECK (difficulty BETWEEN 1 AND 5),
                    affection INTEGER NOT NULL DEFAULT 0
                        CHECK (affection BETWEEN 0 AND 100),
                    stress INTEGER NOT NULL DEFAULT 0
                        CHECK (stress BETWEEN 0 AND 100),
                    status TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'archived', 'deleted')),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT,
                    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (template_id) REFERENCES professor_templates(id) ON DELETE SET NULL,
                    UNIQUE (id, owner_user_id)
                )
                """,
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_professors_owner_template
                ON professors(owner_user_id, template_id)
                WHERE template_id IS NOT NULL AND deleted_at IS NULL
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_professors_owner_status_updated
                ON professors(owner_user_id, status, updated_at DESC)
                """,
                """
                CREATE TABLE IF NOT EXISTS professor_personas (
                    id TEXT PRIMARY KEY,
                    professor_id TEXT NOT NULL,
                    owner_user_id TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    is_current INTEGER NOT NULL DEFAULT 1,
                    persona_json TEXT NOT NULL,
                    source_file_name TEXT,
                    professor_transcript TEXT,
                    engine TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (professor_id, owner_user_id)
                        REFERENCES professors(id, owner_user_id) ON DELETE CASCADE
                )
                """,
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_professor_personas_current
                ON professor_personas(professor_id)
                WHERE is_current = 1
                """,
                """
                CREATE TABLE IF NOT EXISTS user_settings (
                    user_id TEXT PRIMARY KEY,
                    active_professor_id TEXT,
                    preferences_json TEXT NOT NULL DEFAULT '{}',
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (active_professor_id) REFERENCES professors(id) ON DELETE SET NULL
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    professor_id TEXT NOT NULL,
                    title TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    closed_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE
                )
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_professor
                ON chat_sessions(user_id, professor_id, updated_at DESC)
                """,
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('student', 'professor')),
                    content TEXT NOT NULL,
                    intent TEXT,
                    expression TEXT,
                    academic_answer TEXT,
                    styled_reply TEXT,
                    model TEXT,
                    context_sources_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                )
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
                ON chat_messages(session_id, created_at)
                """,
                """
                CREATE TABLE IF NOT EXISTS assignment_reviews (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    professor_id TEXT NOT NULL,
                    lecture_material_id TEXT,
                    title TEXT NOT NULL,
                    assignment_prompt TEXT NOT NULL,
                    submission_file_name TEXT,
                    total_score INTEGER,
                    grade TEXT,
                    summary TEXT,
                    result_json TEXT NOT NULL,
                    engine TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE
                )
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_assignment_reviews_user_professor_created
                ON assignment_reviews(user_id, professor_id, created_at DESC)
                """,
            ]
            with self.connect() as connection:
                connection.execute("PRAGMA journal_mode = WAL")
                for statement in statements:
                    connection.execute(statement)
                connection.execute("PRAGMA optimize")
            self._initialized = True


database = AppDatabase()
