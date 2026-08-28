from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from assignment_grader.auth import get_optional_user
from assignment_grader.lecture_audio import analyze_mock_lecture_audio
from assignment_grader.professor_store import professor_store
from assignment_grader.schemas import AuthUser, LectureAudioAnalysis

router = APIRouter(prefix="/audio", tags=["audio"])

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

    try:
        result = analyze_mock_lecture_audio(
            professor_id=professor_id,
            professor_name=professor_name,
            department=department,
            subject=subject,
            uploaded_audio_name=file_name,
            uploaded_audio_size=len(audio_bytes),
        )
        if user:
            professor_store.save_persona(
                user.id,
                professor_id,
                persona_profile=result.persona_profile,
                source_file_name=result.source_file_name,
                professor_transcript=result.professor_transcript,
                engine=result.engine,
            )
        return result
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"고정 음성 전문을 읽지 못했습니다: {exc}") from exc
