from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR.parent.parent / ".env")
    load_dotenv(BASE_DIR.parent / ".env", override=True)
except ImportError:
    pass

from assignment_grader.database import database
from assignment_grader.routers import assignments, audio, auth, chat, materials, professors, system

database.ensure_schema()

app = FastAPI(
    title="Scholarly Affection API",
    description="과제 첨삭, 강의자료 PDF 요약·저장, 강의 음성 STT·요약, 교수 페르소나 대화를 제공하는 통합 FastAPI 서버",
    version="1.0.0",
)

configured_cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("SCHOLARLY_CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins,
    allow_origin_regex=r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.include_router(system.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(professors.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(audio.router, prefix="/api")
app.include_router(assignments.legacy_router, prefix="/api")
app.include_router(chat.legacy_router, prefix="/api")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")
