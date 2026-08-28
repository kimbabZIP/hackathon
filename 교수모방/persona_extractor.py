"""
persona_extractor.py
교수의 실제 대사/녹음 스크립트 텍스트로부터 언어학적 DNA와 상황별 퓨샷을 자동 역공학하는 추출기.
Google Gemini REST API (gemini-3.5-flash-lite)를 사용하며 429 자가 치유를 지원합니다.
"""

from __future__ import annotations

import asyncio
import datetime
import json
import logging
import os
import re
from typing import Optional

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .schemas import LinguisticDNA, ProfessorPersonaProfile, SituationExemplar

logger = logging.getLogger(__name__)


# ── 페르소나 역공학 메타 프롬프트 ──────────────────────────────────────────

_PERSONA_EXTRACTION_SYSTEM_PROMPT = """\
You are an expert computational linguist and behavioral persona profiler.
Your mission is to rigorously analyze raw speech transcripts of a university professor and reverse-engineer their exact linguistic DNA and communicative signature.

Analyze the speaker's text and extract the following into a valid JSON object matching the schema:

1. `summary_bio`: A 1-2 sentence distillation of the professor's core teaching persona and demeanor.
2. `dna`:
   - `sentence_endings`: 4-6 distinct Korean ending patterns the professor frequently uses (e.g., "~인 거지요", "~거든?", "~하셔야 됩니다", "~해봐 봐").
   - `filler_words`: 4-6 typical Korean verbal tics, pauses, and transition phrases (e.g., "자,", "어... 그니까", "사실상", "주목하세요").
   - `tone_description`: Detailed analysis of their overarching tone (e.g., warm mentor vs. sharp Socratic skeptic vs. demanding perfectionist).
   - `sentence_structure`: Characteristics of sentence rhythm, breathing, and length.
   - `criticism_style`: Exact rhetorical mechanism used when pointing out flaws or student errors.
   - `praise_style`: Exact rhetorical mechanism used when acknowledging good work.
   - `forbidden_phrases`: 3-5 generic AI-sounding phrases that this human professor would NEVER say.
3. `exemplars`: 4 distinct situational feedback samples (1 for MET, 1 for PARTIAL, 1 for NOT_MET, 1 for QUESTION) faithfully reflecting this professor's authentic voice, rhythm, and verbal habits.

CRITICAL INSTRUCTIONS:
- You must output ONLY a valid, parseable JSON object without markdown fences, preamble, or commentary.
- Base your analysis STRICTLY on the linguistic cues present in the input transcript.
"""

_PERSONA_EXTRACTION_USER_PROMPT = """\
[PROFESSOR INFORMATION]
Name: {name}
Department: {department}
Subject: {subject}

[RAW TRANSCRIPT CORPUS BEGIN]
{transcript}
[RAW TRANSCRIPT CORPUS END]

Extract the linguistic DNA and situational exemplars following the system instructions. Output pure JSON.
"""


class PersonaExtractor:
    """교수 대사 텍스트를 분석하여 ProfessorPersonaProfile을 생성하는 엔진"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.5-flash-lite",
    ) -> None:
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        self.model_name = os.environ.get("VISION_MODEL") or os.environ.get("MAP_MODEL") or model_name

    # ── public ──────────────────────────────────────────────────────────────

    async def extract_from_transcript_async(
        self,
        transcript_text: str,
        professor_name: str = "김교수",
        department: str = "소프트웨어학부",
        subject: str = "오픈소스 프로그래밍",
    ) -> ProfessorPersonaProfile:
        """
        교수 대사 텍스트를 분석해 완전한 ProfessorPersonaProfile을 반환한다.
        """
        if not transcript_text.strip():
            raise ValueError("분석할 대사 텍스트가 비어 있습니다.")

        logger.info("교수 페르소나 역공학 분석 시작 (텍스트 길이: %d자)...", len(transcript_text))

        user_prompt = _PERSONA_EXTRACTION_USER_PROMPT.format(
            name=professor_name,
            department=department,
            subject=subject,
            transcript=transcript_text,
        )

        raw_json_str = await self._call_gemini_json(user_prompt)
        profile_data = self._clean_and_parse_json(raw_json_str)

        # Pydantic 모델로 파싱 및 구조화
        dna_data = profile_data.get("dna", {})
        raw_exemplars = profile_data.get("exemplars", [])

        dna = LinguisticDNA(**dna_data) if isinstance(dna_data, dict) else LinguisticDNA()

        exemplars = []
        for idx, item in enumerate(raw_exemplars):
            if isinstance(item, dict):
                exemplars.append(
                    SituationExemplar(
                        situation_type=item.get("situation_type", ["MET", "PARTIAL", "NOT_MET", "QUESTION"][idx % 4]),
                        context_description=item.get("context_description", "과제 채점 상황"),
                        exemplar_speech=item.get("exemplar_speech", str(item)),
                    )
                )
            elif isinstance(item, str):
                s_types = ["MET", "PARTIAL", "NOT_MET", "QUESTION"]
                exemplars.append(
                    SituationExemplar(
                        situation_type=s_types[idx % 4],
                        context_description=f"상황 {idx + 1}",
                        exemplar_speech=item,
                    )
                )

        profile = ProfessorPersonaProfile(
            professor_name=professor_name,
            department=department,
            subject=subject,
            summary_bio=profile_data.get("summary_bio", ""),
            dna=dna,
            exemplars=exemplars,
            created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        logger.info("교수 페르소나 역공학 완료: '%s' 교수 프로필 생성됨.", profile.professor_name)
        return profile

    def extract_from_transcript(
        self,
        transcript_text: str,
        professor_name: str = "김교수",
        department: str = "소프트웨어학부",
        subject: str = "오픈소스 프로그래밍",
    ) -> ProfessorPersonaProfile:
        """동기 래퍼 메서드"""
        return asyncio.run(
            self.extract_from_transcript_async(
                transcript_text=transcript_text,
                professor_name=professor_name,
                department=department,
                subject=subject,
            )
        )

    # ── private ─────────────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    async def _call_gemini_json(self, user_prompt: str) -> str:
        """Gemini REST API 호출 (429 자동 대기 포함)"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{_PERSONA_EXTRACTION_SYSTEM_PROMPT}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 3072,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            for attempt in range(5):
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    try:
                        return data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError):
                        raise ValueError("Gemini가 빈 응답을 반환했습니다.")
                elif resp.status_code == 429:
                    logger.warning("[Gemini 429 Rate Limit] 무료 티어 한도로 25초 대기 후 자동 재개합니다... (%d/5)", attempt + 1)
                    await asyncio.sleep(25.0)
                else:
                    raise RuntimeError(f"Gemini API 오류 ({resp.status_code}): {resp.text}")
            else:
                raise RuntimeError("Gemini API 429 최대 재시도 횟수 초과")

    @staticmethod
    def _clean_and_parse_json(text: str) -> dict:
        """Markdown fence 등을 제거하고 순수 JSON 파싱"""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            # 보정 시도: 중괄호 영역만 추출
            match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            raise ValueError(f"JSON 파싱 실패: {e}\n원본 텍스트: {text[:300]}")
