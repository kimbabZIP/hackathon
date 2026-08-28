from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4

from assignment_grader.database import AppDatabase, database
from assignment_grader.schemas import ProfessorProfileRecord, ProfessorProfileUpsert


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ProfessorStore:
    def __init__(self, app_database: AppDatabase = database) -> None:
        self.database = app_database

    def _record(self, connection: sqlite3.Connection, row: sqlite3.Row) -> ProfessorProfileRecord:
        persona_row = connection.execute(
            """
            SELECT persona_json
            FROM professor_personas
            WHERE professor_id = ? AND is_current = 1
            LIMIT 1
            """,
            (row["id"],),
        ).fetchone()
        settings = connection.execute(
            "SELECT active_professor_id FROM user_settings WHERE user_id = ?",
            (row["owner_user_id"],),
        ).fetchone()
        return ProfessorProfileRecord(
            **dict(row),
            is_active=bool(settings and settings["active_professor_id"] == row["id"]),
            persona_profile=json.loads(persona_row["persona_json"]) if persona_row else None,
        )

    def list_for_user(self, user_id: str) -> list[ProfessorProfileRecord]:
        self.database.ensure_schema()
        with self.database.connect() as connection:
            rows = connection.execute(
                """
                SELECT * FROM professors
                WHERE owner_user_id = ? AND status = 'active' AND deleted_at IS NULL
                ORDER BY updated_at DESC
                """,
                (user_id,),
            ).fetchall()
            return [self._record(connection, row) for row in rows]

    def get_owned(self, user_id: str, professor_id: str) -> ProfessorProfileRecord | None:
        self.database.ensure_schema()
        with self.database.connect() as connection:
            row = connection.execute(
                """
                SELECT * FROM professors
                WHERE id = ? AND owner_user_id = ? AND status = 'active' AND deleted_at IS NULL
                """,
                (professor_id, user_id),
            ).fetchone()
            return self._record(connection, row) if row else None

    def upsert(self, user_id: str, data: ProfessorProfileUpsert) -> ProfessorProfileRecord:
        self.database.ensure_schema()
        now = _now()
        with self.database.connect() as connection:
            connection.execute(
                """
                INSERT INTO professor_templates (
                    id, code, default_name, default_age, default_department,
                    default_specialty, default_personality_type, default_quote,
                    default_difficulty, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
                """,
                (
                    data.template_id,
                    data.template_id,
                    data.name,
                    data.age,
                    data.department,
                    data.specialty,
                    data.personality_type,
                    data.representative_quote,
                    data.difficulty,
                    now,
                    now,
                ),
            )
            existing = connection.execute(
                """
                SELECT id FROM professors
                WHERE owner_user_id = ? AND template_id = ? AND deleted_at IS NULL
                """,
                (user_id, data.template_id),
            ).fetchone()
            professor_id = existing["id"] if existing else f"prof-{uuid4().hex}"
            if existing:
                connection.execute(
                    """
                    UPDATE professors SET
                        name = ?, age = ?, department = ?, lab_name = ?, specialty = ?,
                        personality_type = ?, traits = ?, representative_quote = ?,
                        difficulty = ?, updated_at = ?, status = 'active'
                    WHERE id = ? AND owner_user_id = ?
                    """,
                    (
                        data.name,
                        data.age,
                        data.department,
                        data.lab_name,
                        data.specialty,
                        data.personality_type,
                        data.traits,
                        data.representative_quote,
                        data.difficulty,
                        now,
                        professor_id,
                        user_id,
                    ),
                )
            else:
                connection.execute(
                    """
                    INSERT INTO professors (
                        id, owner_user_id, template_id, name, age, department,
                        lab_name, specialty, personality_type, traits,
                        representative_quote, difficulty, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        professor_id,
                        user_id,
                        data.template_id,
                        data.name,
                        data.age,
                        data.department,
                        data.lab_name,
                        data.specialty,
                        data.personality_type,
                        data.traits,
                        data.representative_quote,
                        data.difficulty,
                        now,
                        now,
                    ),
                )
            if data.make_active:
                connection.execute(
                    """
                    INSERT INTO user_settings (user_id, active_professor_id, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        active_professor_id = excluded.active_professor_id,
                        updated_at = excluded.updated_at
                    """,
                    (user_id, professor_id, now),
                )
            row = connection.execute("SELECT * FROM professors WHERE id = ?", (professor_id,)).fetchone()
            return self._record(connection, row)

    def select(self, user_id: str, professor_id: str) -> ProfessorProfileRecord | None:
        professor = self.get_owned(user_id, professor_id)
        if professor is None:
            return None
        with self.database.connect() as connection:
            connection.execute(
                """
                INSERT INTO user_settings (user_id, active_professor_id, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    active_professor_id = excluded.active_professor_id,
                    updated_at = excluded.updated_at
                """,
                (user_id, professor_id, _now()),
            )
        return self.get_owned(user_id, professor_id)

    def save_persona(
        self,
        user_id: str,
        professor_id: str,
        *,
        persona_profile: dict[str, object],
        source_file_name: str,
        professor_transcript: str,
        engine: str,
    ) -> None:
        if self.get_owned(user_id, professor_id) is None:
            raise ValueError("교수 프로필을 찾을 수 없습니다.")
        self.database.ensure_schema()
        with self.database.connect() as connection:
            previous = connection.execute(
                "SELECT COALESCE(MAX(version), 0) AS version FROM professor_personas WHERE professor_id = ?",
                (professor_id,),
            ).fetchone()
            connection.execute(
                "UPDATE professor_personas SET is_current = 0 WHERE professor_id = ? AND is_current = 1",
                (professor_id,),
            )
            connection.execute(
                """
                INSERT INTO professor_personas (
                    id, professor_id, owner_user_id, version, is_current,
                    persona_json, source_file_name, professor_transcript, engine, created_at
                ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
                """,
                (
                    f"persona-{uuid4().hex}",
                    professor_id,
                    user_id,
                    previous["version"] + 1,
                    json.dumps(persona_profile, ensure_ascii=False),
                    source_file_name,
                    professor_transcript,
                    engine,
                    _now(),
                ),
            )


professor_store = ProfessorStore()
