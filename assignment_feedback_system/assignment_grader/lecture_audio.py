from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from audio_pipeline import AudioExtractionResult, AudioProfessorExtractor

from assignment_grader.schemas import LectureAudioAnalysis

TRANSCRIPT_PATH = WORKSPACE_ROOT / "scholarly-affection" / "transcript.txt"
logger = logging.getLogger("uvicorn.error")


def _read_fixed_transcript() -> str | None:
    if not TRANSCRIPT_PATH.is_file():
        return None
    transcript = TRANSCRIPT_PATH.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    return transcript or None


def fixed_transcript_available() -> bool:
    try:
        return _read_fixed_transcript() is not None
    except OSError:
        return False


def _normalize_persona_profile(
    raw_profile: dict[str, Any],
    *,
    professor_name: str,
    department: str,
    subject: str,
) -> dict[str, Any]:
    profile = dict(raw_profile)
    raw_dna = profile.get("dna")
    dna = dict(raw_dna) if isinstance(raw_dna, dict) else {}

    def string_list(key: str, default: list[str] | None = None) -> list[str]:
        value = dna.get(key)
        if not isinstance(value, list):
            return list(default or [])
        return [str(item).strip() for item in value if str(item).strip()]

    def description(key: str, default: str) -> str:
        value = dna.get(key)
        return str(value).strip() if value else default

    profile.update(
        {
            "professor_name": professor_name,
            "department": department,
            "subject": subject,
            "summary_bio": str(profile.get("summary_bio") or "").strip()
            or "업로드한 강의 음성의 실제 교수 발화를 바탕으로 구성한 말투 프로필입니다.",
            "dna": {
                **dna,
                "sentence_endings": string_list("sentence_endings"),
                "filler_words": string_list("filler_words"),
                "tone_description": description(
                    "tone_description",
                    "업로드한 강의 음성에서 추출된 교수 발화의 어조를 따릅니다.",
                ),
                "sentence_structure": description(
                    "sentence_structure",
                    "실제 교수 발화의 문장 구성과 설명 흐름을 따릅니다.",
                ),
                "criticism_style": description(
                    "criticism_style",
                    "음성에서 명확히 확인된 비판 방식이 없습니다.",
                ),
                "praise_style": description(
                    "praise_style",
                    "음성에서 명확히 확인된 칭찬 방식이 없습니다.",
                ),
                "forbidden_phrases": string_list(
                    "forbidden_phrases",
                    [
                        "전반적으로 좋은 시도였습니다",
                        "도움이 되셨기를 바랍니다",
                        "AI 어시스턴트로서",
                    ],
                ),
            },
        }
    )
    return profile


def _fixed_transcript_analysis(
    *,
    transcript: str,
    professor_id: str,
    professor_name: str,
    department: str,
    subject: str,
    uploaded_audio_name: str,
    uploaded_audio_size: int,
) -> LectureAudioAnalysis:
    transcript_lines = [line.strip() for line in transcript.splitlines() if line.strip()]
    diarized = "\n".join(f"[Speaker 1 (Professor)]: {line}" for line in transcript_lines)

    return LectureAudioAnalysis(
        professor_id=professor_id,
        professor_transcript=transcript,
        full_diarized_transcript=diarized,
        summary=(
            "소프트웨어 중심 사회의 배경, 컴퓨터의 범용성, 알고리즘과 프로그래밍 언어의 관계, "
            "정렬 예시를 통한 문제 해결과 효율성을 설명하는 입문 강의입니다."
        ),
        persona_profile={
            "professor_name": professor_name,
            "department": department,
            "subject": subject,
            "summary_bio": (
                "실생활과 산업 사례에서 출발해 개념을 단계적으로 풀어내고, 반복과 확인 질문으로 "
                "학습자의 이해를 이끄는 친근한 설명형 교수입니다."
            ),
            "dna": {
                "sentence_endings": [
                    "~라고 보시면 됩니다",
                    "~하는 겁니다",
                    "~할 거예요",
                    "~잖아요",
                    "~라고 했죠",
                    "~해보겠습니다",
                ],
                "filler_words": ["예를 들어", "그래서", "결국에는", "어쨌든", "잘 생각해보시면", "이제"],
                "tone_description": (
                    "권위적으로 단정하기보다 청중에게 말을 거는 친근한 구어체를 사용합니다. "
                    "익숙한 사례를 먼저 제시하고 핵심 개념으로 수렴하는 설명형 톤이 두드러집니다."
                ),
                "sentence_structure": (
                    "긴 설명형 복문 사이에 짧은 확인 질문을 배치하고, 같은 개념을 표현만 바꾸어 반복합니다."
                ),
                "criticism_style": (
                    "잘못된 가정이나 한계를 질문으로 드러낸 뒤 구체적인 절차와 대안을 다시 설명합니다."
                ),
                "praise_style": (
                    "학습자가 패턴을 발견했는지 확인하고 다음 단계로 자연스럽게 진입시키는 방식입니다."
                ),
                "forbidden_phrases": [
                    "전반적으로 좋은 시도였습니다",
                    "도움이 되셨기를 바랍니다",
                    "종합적으로 고려해 보세요",
                    "AI 어시스턴트로서",
                ],
            },
        },
        source_file_name="transcript.txt",
        uploaded_audio_name=uploaded_audio_name,
        uploaded_audio_size=uploaded_audio_size,
        character_count=len(transcript),
        line_count=len(transcript_lines),
        extracted_at=datetime.now(timezone.utc).isoformat(),
        engine="Mock AudioProfessorExtractor · transcript.txt",
    )


def analyze_mock_lecture_audio(
    *,
    professor_id: str,
    professor_name: str,
    department: str,
    subject: str,
    uploaded_audio_name: str,
    uploaded_audio_size: int,
) -> LectureAudioAnalysis:
    """기존 호출부를 위한 고정 전문 전용 호환 함수입니다."""
    transcript = _read_fixed_transcript()
    if transcript is None:
        raise FileNotFoundError(f"고정 음성 전문을 찾을 수 없습니다: {TRANSCRIPT_PATH}")
    return _fixed_transcript_analysis(
        transcript=transcript,
        professor_id=professor_id,
        professor_name=professor_name,
        department=department,
        subject=subject,
        uploaded_audio_name=uploaded_audio_name,
        uploaded_audio_size=uploaded_audio_size,
    )


async def analyze_lecture_audio(
    *,
    professor_id: str,
    professor_name: str,
    department: str,
    subject: str,
    uploaded_audio_name: str,
    uploaded_audio_size: int,
    audio_bytes: bytes,
    progress_id: str = "unknown",
) -> LectureAudioAnalysis:
    transcript = _read_fixed_transcript()
    if transcript is not None:
        logger.info(
            "[audio:%s] [2/6] 고정 음성 전문 사용 (경로=%s, 길이=%d자); 실제 STT 호출 생략",
            progress_id,
            TRANSCRIPT_PATH.name,
            len(transcript),
        )
        result = _fixed_transcript_analysis(
            transcript=transcript,
            professor_id=professor_id,
            professor_name=professor_name,
            department=department,
            subject=subject,
            uploaded_audio_name=uploaded_audio_name,
            uploaded_audio_size=uploaded_audio_size,
        )
        logger.info("[audio:%s] [6/6] 고정 전문 분석 완료", progress_id)
        return result

    model_name = os.getenv("AUDIO_GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
    suffix = Path(uploaded_audio_name).suffix.lower() or ".mp3"
    logger.info(
        "[audio:%s] [2/6] 고정 전문 없음; 실제 Gemini STT 폴백 선택 (모델=%s)",
        progress_id,
        model_name,
    )
    extractor: AudioProfessorExtractor | None = None
    with TemporaryDirectory(prefix="scholarly-audio-") as temp_dir:
        audio_path = Path(temp_dir) / f"lecture{suffix}"
        audio_path.write_bytes(audio_bytes)
        logger.info(
            "[audio:%s] [2/6] 서버 임시 음성 파일 준비 완료 (크기=%.2f MB)",
            progress_id,
            len(audio_bytes) / (1024 * 1024),
        )
        try:
            extractor = AudioProfessorExtractor(model_name=model_name)
            extracted: AudioExtractionResult = await extractor.extract_from_audio_async(
                str(audio_path),
                professor_context={
                    "professor_name": professor_name,
                    "department": department,
                    "subject": subject,
                },
                progress_id=progress_id,
            )
        finally:
            if extractor is not None:
                extractor.close()
    logger.info("[audio:%s] [정리] 서버 임시 음성 파일 삭제 완료", progress_id)

    professor_transcript = extracted.professor_transcript.strip()
    summary = extracted.summary.strip()
    if not professor_transcript:
        raise ValueError("Gemini가 교수 화자의 음성 전문을 추출하지 못했습니다.")
    if not summary:
        raise ValueError("Gemini가 강의 내용 요약을 반환하지 않았습니다.")

    transcript_lines = [line.strip() for line in professor_transcript.splitlines() if line.strip()]
    full_diarized_transcript = extracted.full_diarized_transcript.strip() or "\n".join(
        f"[{extracted.professor_speaker_id} (Professor)]: {line}" for line in transcript_lines
    )

    result = LectureAudioAnalysis(
        professor_id=professor_id,
        professor_transcript=professor_transcript,
        full_diarized_transcript=full_diarized_transcript,
        summary=summary,
        persona_profile=_normalize_persona_profile(
            extracted.persona_profile,
            professor_name=professor_name,
            department=department,
            subject=subject,
        ),
        source_file_name=uploaded_audio_name,
        uploaded_audio_name=uploaded_audio_name,
        uploaded_audio_size=uploaded_audio_size,
        character_count=len(professor_transcript),
        line_count=len(transcript_lines),
        extracted_at=datetime.now(timezone.utc).isoformat(),
        engine=f"Gemini AudioProfessorExtractor · {model_name}",
    )
    logger.info(
        "[audio:%s] [응답] FastAPI 응답 구성 완료 (전문=%d자, 요약=%d자)",
        progress_id,
        result.character_count,
        len(result.summary),
    )
    return result
