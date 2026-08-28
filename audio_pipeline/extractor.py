"""
오디오 파이프라인: 녹음 파일(mp3, wav, m4a 등)에서 음성 인식, 화자 분리(Diarization),
교수 화자 자동 식별 및 교수 대사 필터링 추출 모듈
"""

import asyncio
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

import google.generativeai as genai
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger("audio_pipeline")

# 지원하는 오디오 확장자 목록
SUPPORTED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".wma"}


# ── 데이터 스키마 ─────────────────────────────────────────────────────────────

class SpeakerInfo(BaseModel):
    speaker_id: str = Field(..., description="화자 식별자 (예: Speaker 1, Speaker A)")
    role: str = Field(..., description="화자 역할 (예: Professor, Student, Teaching Assistant)")
    rationale: str = Field(..., description="해당 역할로 판단한 근거")


class AudioExtractionResult(BaseModel):
    speakers: List[SpeakerInfo] = Field(default_factory=list, description="분리된 화자 목록 및 역할")
    professor_speaker_id: str = Field(default="Speaker 1", description="교수로 식별된 화자 ID")
    professor_transcript: str = Field(..., description="교수 화자의 발화만 정제하여 이어붙인 텍스트")
    full_diarized_transcript: str = Field(default="", description="전체 화자 분리 대화록")
    summary: str = Field(default="", description="오디오 내용 및 강의 상황 요약")


# ── 프롬프트 ─────────────────────────────────────────────────────────────────

_AUDIO_DIARIZATION_PROMPT = """\
당신은 최고의 음성 분석 및 화자 분리(Speaker Diarization) 전문가입니다.
첨부된 오디오(강의/연구실 녹음 파일)를 정밀하게 분석하여 다음 작업을 완벽하게 수행하십시오:

1. **화자 분리 (Speaker Diarization)**:
   - 오디오에 등장하는 모든 화자(Speaker 1, Speaker 2 등)를 명확히 구분하십시오.
   - 각 화자의 발화 내용, 어조, 지위를 분석하여 역할(Professor / Student / Others)을 판별하십시오.

2. **교수(Professor) 화자 자동 식별**:
   - 수업을 주도하고, 개념을 설명하며, 학생을 지도하거나 훈계하는 '교수(강사)' 화자를 정확하게 찾아내십시오.

3. **교수 대사만 추출 및 정제**:
   - 오디오에서 **'교수 화자의 발화'만 쏙 골라내어 자연스럽게 연결된 정제된 텍스트**(`professor_transcript`)로 추출하십시오.
   - 학생의 단순 질문이나 잡음은 제외하고, 교수의 어투, 억양, 추임새, 성향이 온전히 드러나도록 텍스트를 복원하십시오.

반드시 아래 JSON 형식으로만 응답하십시오:
```json
{
  "speakers": [
    {
      "speaker_id": "Speaker 1",
      "role": "Professor",
      "rationale": "강의를 주도하며 알고리즘 개념을 학생들에게 설명하고 지도함"
    },
    {
      "speaker_id": "Speaker 2",
      "role": "Student",
      "rationale": "교수에게 질문을 던짐"
    }
  ],
  "professor_speaker_id": "Speaker 1",
  "professor_transcript": "교수님의 모든 발화 내용을 모아놓은 정제된 전체 텍스트...",
  "full_diarized_transcript": "[Speaker 1 (Professor)]: 안녕하십니까 여러분...\n[Speaker 2 (Student)]: 교수님 질문 있습니다...\n...",
  "summary": "오디오 녹음 상황에 대한 간략한 요약"
}
```
"""


# ── 메인 추출기 클래스 ────────────────────────────────────────────────────────

class AudioProfessorExtractor:
    """오디오 파일에서 화자 분리 및 교수 대사 자동 추출기"""

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 또는 GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")
        genai.configure(api_key=api_key)
        self.model_name = model_name

    @staticmethod
    def is_audio_file(file_path: str) -> bool:
        """주어진 파일 경로가 지원되는 오디오 파일인지 확인"""
        ext = Path(file_path).suffix.lower()
        return ext in SUPPORTED_AUDIO_EXTENSIONS

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def extract_from_audio_async(self, audio_file_path: str) -> AudioExtractionResult:
        """
        오디오 파일을 Gemini 멀티모달 API에 업로드하여 화자 분리 및 교수 대사 추출 수행
        """
        path = Path(audio_file_path)
        if not path.exists():
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {audio_file_path}")

        logger.info("오디오 파일 업로드 및 분석 시작: %s (크기: %.2f MB)", path.name, path.stat().st_size / (1024 * 1024))

        # 1. 파일 업로드 (Gemini Files API 활용)
        uploaded_file = await asyncio.to_thread(genai.upload_file, path=str(path))
        logger.info("✓ Gemini 오디오 업로드 완료: %s (MIME: %s)", uploaded_file.name, uploaded_file.mime_type)

        try:
            # 2. 멀티모달 프롬프트 실행
            model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.2,
                }
            )

            response = await asyncio.to_thread(
                model.generate_content,
                [uploaded_file, _AUDIO_DIARIZATION_PROMPT]
            )

            raw_text = response.text.strip()
            clean_json = self._clean_json(raw_text)
            data = json.loads(clean_json)

            result = AudioExtractionResult(**data)
            logger.info(
                "✓ 화자 분리 및 교수 대사 추출 완료! (식별된 교수: %s, 추출된 대사 길이: %d자)",
                result.professor_speaker_id,
                len(result.professor_transcript),
            )
            return result

        finally:
            # 3. 임시 업로드 파일 삭제 정리
            try:
                await asyncio.to_thread(genai.delete_file, name=uploaded_file.name)
                logger.info("✓ Gemini 원격 임시 오디오 파일 정리 완료")
            except Exception as e:
                logger.warning("원격 파일 삭제 중 경고: %s", e)

    @staticmethod
    def _clean_json(raw_text: str) -> str:
        """JSON 마크다운 코드블록 제거 및 정제"""
        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
