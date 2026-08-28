from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
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
    description="과제 첨삭, 강의자료 PDF 요약·저장, 모의 강의 음성 분석, 교수 페르소나 대화를 제공하는 통합 FastAPI 서버",
    version="1.0.0",
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
