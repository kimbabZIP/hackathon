"""
feedback_simulator.py
합성된 교수 페르소나를 사용하여 실제 학생 과제 초안을 첨삭하고
기능명세 2.8절 규격의 피드백 결과를 생성하는 시뮬레이터.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Optional

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .prompt_synthesizer import PromptSynthesizer
from .schemas import FeedbackResponseContract, ProfessorPersonaProfile

logger = logging.getLogger(__name__)


class FeedbackSimulator:
    """합성된 교수 페르소나로 학생 과제를 실시간 첨삭하는 시뮬레이터"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.5-flash-lite",
    ) -> None:
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        self.model_name = os.environ.get("MAP_MODEL") or os.environ.get("REDUCE_MODEL") or model_name

    async def evaluate_submission_async(
        self,
        profile: ProfessorPersonaProfile,
        submission_text: str,
        rubric_criteria: list[dict],
        lecture_evidence_chunks: list[dict],
    ) -> FeedbackResponseContract:
        """
        학생 과제를 교수의 페르소나로 평가하여 구조화된 피드백을 반환한다.
        """
        logger.info("교수 '%s' 페르소나로 과제 첨삭 평가 시작...", profile.professor_name)

        system_prompt = PromptSynthesizer.synthesize_system_prompt(profile)
        user_prompt = PromptSynthesizer.format_assignment_prompt(
            submission_text=submission_text,
            rubric_criteria=rubric_criteria,
            lecture_evidence_chunks=lecture_evidence_chunks,
        )

        raw_json_str = await self._call_gemini_json(system_prompt, user_prompt)
        parsed_data = self._clean_and_parse_json(raw_json_str)

        feedback = FeedbackResponseContract(**parsed_data)
        logger.info("과제 첨삭 완료: %d개 루브릭 항목 평가 완료.", len(feedback.items))
        return feedback

    def evaluate_submission(
        self,
        profile: ProfessorPersonaProfile,
        submission_text: str,
        rubric_criteria: list[dict],
        lecture_evidence_chunks: list[dict],
    ) -> FeedbackResponseContract:
        """동기 래퍼 메서드"""
        return asyncio.run(
            self.evaluate_submission_async(
                profile=profile,
                submission_text=submission_text,
                rubric_criteria=rubric_criteria,
                lecture_evidence_chunks=lecture_evidence_chunks,
            )
        )

    # ── private ─────────────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    async def _call_gemini_json(self, system_prompt: str, user_prompt: str) -> str:
        """Gemini REST API 호출 (429 자동 대기 포함)"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 4096,
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
                        raise ValueError("Gemini가 빈 피드백 응답을 반환했습니다.")
                elif resp.status_code == 429:
                    logger.warning("[Gemini 429 Rate Limit] 25초 대기 후 자동 재시도합니다... (%d/5)", attempt + 1)
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
            match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            raise ValueError(f"JSON 파싱 실패: {e}\n원본 텍스트: {text[:300]}")
