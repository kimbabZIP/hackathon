from __future__ import annotations

import logging
import time
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from assignment_grader.auth import get_optional_user
from assignment_grader.lecture_audio import analyze_lecture_audio
from assignment_grader.professor_store import professor_store
from assignment_grader.schemas import AuthUser, LectureAudioAnalysis

router = APIRouter(prefix="/audio", tags=["audio"])
logger = logging.getLogger("uvicorn.error")

MAX_AUDIO_BYTES = 100 * 1024 * 1024
SUPPORTED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".wma"}


@router.post("/analyze", response_model=LectureAudioAnalysis)
async def analyze_audio(
    professor_id: str = Form(..., min_length=1, max_length=200),
    professor_name: str = Form(..., min_length=1, max_length=100),
    department: str = Form(..., min_length=1, max_length=200),
    subject: str = Form(..., min_length=1, max_length=300),
    file: UploadFile = File(...),
    user: AuthUser | None = Depends(get_optional_user),
) -> LectureAudioAnalysis:
    if user and professor_store.get_owned(user.id, professor_id) is None:
        raise HTTPException(status_code=404, detail="교수 프로필을 찾을 수 없습니다.")
    file_name = file.filename or "lecture.mp3"
    if Path(file_name).suffix.lower() not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=422, detail="지원되는 강의 음성 파일 형식이 아닙니다.")

    audio_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="빈 음성 파일은 처리할 수 없습니다.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="강의 음성 파일은 최대 100MB까지 업로드할 수 있습니다.")

    progress_id = uuid4().hex[:8]
    started_at = time.monotonic()
    logger.info(
        "[audio:%s] [1/6] 음성 분석 요청 접수 (파일=%s, 크기=%.2f MB, 교수ID=%s)",
        progress_id,
        file_name,
        len(audio_bytes) / (1024 * 1024),
        professor_id,
    )
    try:
        result = await analyze_lecture_audio(
            professor_id=professor_id,
            professor_name=professor_name,
            department=department,
            subject=subject,
            uploaded_audio_name=file_name,
            uploaded_audio_size=len(audio_bytes),
            audio_bytes=audio_bytes,
            progress_id=progress_id,
        )
    except OSError as exc:
        logger.exception("[audio:%s] 강의 음성 임시 파일 또는 고정 전문 처리 실패", progress_id)
        raise HTTPException(status_code=500, detail=f"강의 음성 파일을 처리하지 못했습니다: {exc}") from exc
    except ValueError as exc:
        logger.exception("[audio:%s] 강의 음성 분석 설정 또는 응답 오류", progress_id)
        status_code = 503 if "API_KEY" in str(exc) else 502
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("[audio:%s] Gemini 강의 음성 분석 실패", progress_id)
        raise HTTPException(status_code=502, detail=f"음성 STT·LLM 분석에 실패했습니다: {exc}") from exc

    if user:
        logger.info("[audio:%s] [저장] 교수 말투 특징을 데이터베이스에 저장 중", progress_id)
        professor_store.save_persona(
            user.id,
            professor_id,
            persona_profile=result.persona_profile,
            source_file_name=result.source_file_name,
            professor_transcript=result.professor_transcript,
            engine=result.engine,
        )
        logger.info("[audio:%s] [저장] 교수 말투 특징 저장 완료", progress_id)
    logger.info(
        "[audio:%s] [완료] 음성 분석 요청 처리 종료 (총 %.1f초)",
        progress_id,
        time.monotonic() - started_at,
    )
    return result
