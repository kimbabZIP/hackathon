from __future__ import annotations

import json
import os
import threading
from datetime import datetime
from pathlib import Path

from assignment_grader.schemas import ProfessorChatContextSource

DEFAULT_LOG_PATH = Path(__file__).resolve().parent.parent / "logs" / "professor_chat_responses.jsonl"
LOG_PATH_ENV = "PROFESSOR_CHAT_LOG_PATH"

_write_lock = threading.Lock()


def professor_chat_log_path() -> Path:
    configured_path = os.getenv(LOG_PATH_ENV, "").strip()
    return Path(configured_path).expanduser() if configured_path else DEFAULT_LOG_PATH


def append_professor_chat_record(
    *,
    professor_id: str | None,
    professor_name: str,
    department: str,
    student_message: str,
    intent: str,
    confidence: float,
    academic_model: str,
    stylizer_model: str,
    academic_answer: str,
    styled_reply: str,
    expression: str,
    context_sources: list[ProfessorChatContextSource],
) -> Path:
    path = professor_chat_log_path()
    record = {
        "logged_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "professor_id": professor_id,
        "professor_name": professor_name,
        "department": department,
        "student_message": student_message,
        "intent": intent,
        "confidence": confidence,
        "academic_model": academic_model,
        "stylizer_model": stylizer_model,
        "academic_answer": academic_answer,
        "styled_reply": styled_reply,
        "expression": expression,
        "context_sources": [source.model_dump(mode="json") for source in context_sources],
    }
    line = json.dumps(record, ensure_ascii=False, separators=(",", ":"))

    with _write_lock:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8", newline="\n") as log_file:
            log_file.write(line)
            log_file.write("\n")

    return path
