from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

from assignment_grader.database import DEFAULT_DB_PATH
from assignment_grader.schemas import LectureMaterialRecord, ProfessorChatContextSource


class LectureMaterialStore:
    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self._lock = threading.Lock()
        self._initialized = False

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def _ensure_schema(self) -> None:
        if self._initialized:
            return
        with self._lock:
            if self._initialized:
                return
            with self._connect() as connection:
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS lecture_materials (
                        id TEXT PRIMARY KEY,
                        owner_user_id TEXT,
                        professor_id TEXT NOT NULL,
                        content_sha256 TEXT,
                        title TEXT NOT NULL,
                        file_name TEXT NOT NULL,
                        file_size INTEGER NOT NULL,
                        total_pages INTEGER NOT NULL,
                        processed_chunks INTEGER NOT NULL,
                        summary TEXT NOT NULL,
                        engine TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                columns = {
                    row["name"]
                    for row in connection.execute("PRAGMA table_info(lecture_materials)").fetchall()
                }
                if "owner_user_id" not in columns:
                    connection.execute("ALTER TABLE lecture_materials ADD COLUMN owner_user_id TEXT")
                if "content_sha256" not in columns:
                    connection.execute("ALTER TABLE lecture_materials ADD COLUMN content_sha256 TEXT")
                connection.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_lecture_materials_professor_created
                    ON lecture_materials(professor_id, created_at DESC)
                    """
                )
                connection.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_lecture_materials_owner_professor_created
                    ON lecture_materials(owner_user_id, professor_id, created_at DESC)
                    """
                )
                connection.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_lecture_materials_owner_professor_hash
                    ON lecture_materials(owner_user_id, professor_id, content_sha256)
                    """
                )
                connection.execute("PRAGMA optimize")
            self._initialized = True

    @staticmethod
    def _record(row: sqlite3.Row) -> LectureMaterialRecord:
        return LectureMaterialRecord(**dict(row))

    def save(self, record: LectureMaterialRecord) -> LectureMaterialRecord:
        self._ensure_schema()
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO lecture_materials (
                    id, owner_user_id, professor_id, content_sha256, title, file_name, file_size,
                    total_pages, processed_chunks, summary, engine, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.owner_user_id,
                    record.professor_id,
                    record.content_sha256,
                    record.title,
                    record.file_name,
                    record.file_size,
                    record.total_pages,
                    record.processed_chunks,
                    record.summary,
                    record.engine,
                    record.created_at,
                ),
            )
        return record

    def find_cached(
        self,
        *,
        owner_user_id: str | None,
        professor_id: str,
        content_sha256: str,
        file_name: str,
        file_size: int,
    ) -> LectureMaterialRecord | None:
        self._ensure_schema()
        owner_clause = "owner_user_id IS NULL" if owner_user_id is None else "owner_user_id = ?"
        owner_parameters: tuple[object, ...] = () if owner_user_id is None else (owner_user_id,)
        with self._lock, self._connect() as connection:
            row = connection.execute(
                f"""
                SELECT id, owner_user_id, professor_id, content_sha256, title, file_name, file_size,
                       total_pages, processed_chunks, summary, engine, created_at
                FROM lecture_materials
                WHERE {owner_clause} AND professor_id = ? AND content_sha256 = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (*owner_parameters, professor_id, content_sha256),
            ).fetchone()
            if row is None:
                row = connection.execute(
                    f"""
                    SELECT id, owner_user_id, professor_id, content_sha256, title, file_name, file_size,
                           total_pages, processed_chunks, summary, engine, created_at
                    FROM lecture_materials
                    WHERE {owner_clause} AND professor_id = ?
                      AND content_sha256 IS NULL AND file_name = ? AND file_size = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (*owner_parameters, professor_id, file_name, file_size),
                ).fetchone()
                if row is not None:
                    connection.execute(
                        "UPDATE lecture_materials SET content_sha256 = ? WHERE id = ?",
                        (content_sha256, row["id"]),
                    )
                    row = connection.execute(
                        """
                        SELECT id, owner_user_id, professor_id, content_sha256, title, file_name, file_size,
                               total_pages, processed_chunks, summary, engine, created_at
                        FROM lecture_materials WHERE id = ?
                        """,
                        (row["id"],),
                    ).fetchone()
        return self._record(row).model_copy(update={"cache_hit": True}) if row else None

    def list_for_professor(
        self,
        professor_id: str,
        limit: int = 20,
        *,
        owner_user_id: str | None = None,
    ) -> list[LectureMaterialRecord]:
        self._ensure_schema()
        with self._connect() as connection:
            if owner_user_id is None:
                rows = connection.execute(
                    """
                    SELECT id, owner_user_id, professor_id, content_sha256, title, file_name, file_size,
                           total_pages, processed_chunks, summary, engine, created_at
                    FROM lecture_materials
                    WHERE professor_id = ? AND owner_user_id IS NULL
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (professor_id, limit),
                ).fetchall()
            else:
                rows = connection.execute(
                    """
                    SELECT id, owner_user_id, professor_id, content_sha256, title, file_name, file_size,
                           total_pages, processed_chunks, summary, engine, created_at
                    FROM lecture_materials
                    WHERE professor_id = ? AND owner_user_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (professor_id, owner_user_id, limit),
                ).fetchall()
        return [self._record(row) for row in rows]

    def build_chat_context(
        self,
        professor_id: str,
        *,
        owner_user_id: str | None = None,
        limit: int = 3,
        max_chars: int = 12_000,
    ) -> tuple[str, list[ProfessorChatContextSource]]:
        records = self.list_for_professor(
            professor_id,
            limit=limit,
            owner_user_id=owner_user_id,
        )
        sections: list[str] = []
        sources: list[ProfessorChatContextSource] = []
        used_chars = 0

        for record in records:
            header = f"## {record.title} ({record.file_name})\n"
            remaining = max_chars - used_chars - len(header)
            if remaining <= 0:
                break
            summary = record.summary[:remaining]
            sections.append(header + summary)
            used_chars += len(header) + len(summary)
            sources.append(
                ProfessorChatContextSource(
                    material_id=record.id,
                    title=record.title,
                    file_name=record.file_name,
                )
            )

        return "\n\n".join(sections), sources


material_store = LectureMaterialStore()
