from __future__ import annotations

import os

from fastapi import APIRouter

from assignment_grader.lecture_audio import fixed_transcript_available

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict[str, object]:
    assignment_ai_enabled = bool(os.getenv("GRADE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY"))
    chat_ai_enabled = bool(os.getenv("CHAT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY"))
    material_ai_enabled = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    audio_ai_enabled = material_ai_enabled
    uses_fixed_audio_transcript = fixed_transcript_available()
    return {
        "status": "ok",
        "ai_enabled": assignment_ai_enabled,
        "chat_ai_enabled": chat_ai_enabled,
        "services": {
            "auth": {"status": "ok", "storage": "sqlite"},
            "professors": {"status": "ok", "storage": "sqlite"},
            "assignments": {"status": "ok", "ai_enabled": assignment_ai_enabled},
            "chat": {"status": "ok", "ai_enabled": chat_ai_enabled},
            "materials": {"status": "ok", "ai_enabled": material_ai_enabled},
            "audio": {
                "status": "ok",
                "ai_enabled": audio_ai_enabled,
                "mode": "mock-transcript" if uses_fixed_audio_transcript else "gemini-stt-summary",
                "fallback": "gemini-stt-summary",
            },
        },
    }


@router.get("")
async def api_index() -> dict[str, object]:
    return {
        "name": "Scholarly Affection API",
        "version": "1.0.0",
        "routes": {
            "health": "/api/health",
            "auth": "/api/auth/me",
            "professors": "/api/professors",
            "assignments": "/api/assignments",
            "chat": "/api/chat",
            "materials": "/api/materials",
            "audio": "/api/audio/analyze",
            "docs": "/docs",
        },
    }
