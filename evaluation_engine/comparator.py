"""
comparator.py
정규화된 학생 제출본 Diff, 1:N 항목별 응답, 교육 지식 노드를 교차 비교하여
루브릭별 개선도(IMPROVED / MAINTAINED / REGRESSED)와 점수 변화를 판정하는 비교 검증 엔진.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .schemas import (
    CriterionComparisonResult,
    NormalizedLectureKnowledge,
    NormalizedSubmission,
    VersionComparisonReport,
)

logger = logging.getLogger(__name__)


_COMPARISON_SYSTEM_PROMPT = """\
You are an objective academic evaluator and fact-checker cross-referencing a student's revised submission against lecture knowledge rules and rubric criteria.
Your task is to analyze how the student revised their submission from v1 to v2 across specific grading criteria, determining:
1. `result`:
   - "IMPROVED": The previous error quote was revised correctly adhering to lecture rules and previous feedback.
   - "MAINTAINED": The previous error persists, was ignored, or the student made trivial edits without fixing the core violation.
   - "REGRESSED": The student attempted a fix but introduced a worse conceptual error violating lecture rules.
   - "UNDETERMINED": Insufficient evidence to judge.
2. `v2_verdict`: "MET" | "PARTIAL" | "NOT_MET" | "UNDETERMINED"
3. `score_after`: Calculated score for this criterion (between 0 and max_score).
4. `score_min` and `score_max`: Expected score range.
5. `achievement_rate`: Percentage (0.0 to 100.0) of points achieved for this criterion.
6. `reason`: Detailed, grounded critique explaining why the revision is improved, maintained, or regressed in the professor's distinctive voice.
7. `action`: 1 concrete, actionable next step for the student.
8. `expression`: "SMILE" if IMPROVED, "SERIOUS" or "QUESTION" if MAINTAINED, "WARNING" if REGRESSED.

CRITICAL INSTRUCTIONS:
- You must output ONLY a valid JSON object matching the schema.
- Base your judgment STRICTLY on the normalized sentence diffs and lecture knowledge rules provided.
"""


class KnowledgeComparator:
    """정규화된 지식 노드와 학생 답변을 교차 비교하여 재평가 리포트를 생성하는 엔진"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.5-flash-lite",
    ) -> None:
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        self.model_name = os.environ.get("REDUCE_MODEL") or os.environ.get("MAP_MODEL") or model_name

    async def compare_versions_async(
        self,
        assignment_id: str,
        normalized_sub: NormalizedSubmission,
        normalized_knowledge: NormalizedLectureKnowledge,
        rubric_criteria: List[Dict[str, Any]],
        previous_feedback_items: List[Dict[str, Any]],
        professor_persona_prompt: str = "",
    ) -> VersionComparisonReport:
        """
        정규화된 데이터들을 비교 분석하여 전체 VersionComparisonReport를 생성한다.
        """
        logger.info(
            "버전 비교 평가 시작 (v%d ➔ v%d, 변경 문장 수: %d개)...",
            normalized_sub.base_version_no,
            normalized_sub.target_version_no,
            len([d for d in normalized_sub.diff_items if d.diff_type != "UNCHANGED"]),
        )

        active_diffs = [
            d.model_dump()
            for d in normalized_sub.diff_items
            if d.diff_type in ["MODIFIED", "ADDED", "DELETED"]
        ]

        user_prompt = f"""\
[PROFESSOR PERSONA GUIDELINES]
{professor_persona_prompt}

[LECTURE KNOWLEDGE RULES (FACT SOURCES)]
{json.dumps([r.model_dump() for r in normalized_knowledge.rules], ensure_ascii=False, indent=2)}

[RUBRIC CRITERIA]
{json.dumps(rubric_criteria, ensure_ascii=False, indent=2)}

[PREVIOUS FEEDBACK FROM BASE VERSION (v{normalized_sub.base_version_no})]
{json.dumps(previous_feedback_items, ensure_ascii=False, indent=2)}

[NORMALIZED STUDENT REVISION DIFFS (v{normalized_sub.base_version_no} ➔ v{normalized_sub.target_version_no})]
{json.dumps(active_diffs, ensure_ascii=False, indent=2)}

[STUDENT 1:N EXPLANATION RESPONSES]
{json.dumps([resp.model_dump() for resp in normalized_sub.item_responses], ensure_ascii=False, indent=2)}

Evaluate each rubric criterion. Return JSON with this structure:
{{
  "criterion_results": [
    {{
      "criterion_id": "string",
      "criterion_name": "string",
      "category": "COURSE_SPECIFIC",
      "max_score": int,
      "weight": int,
      "v1_verdict": "NOT_MET | PARTIAL | MET",
      "v2_verdict": "MET | PARTIAL | NOT_MET | UNDETERMINED",
      "result": "IMPROVED | MAINTAINED | REGRESSED | UNDETERMINED",
      "score_before": int,
      "score_after": int,
      "score_delta": int,
      "score_min": int,
      "score_max": int,
      "achievement_rate": float,
      "confidence": "HIGH | MEDIUM | LOW",
      "previous_problem_quote": "string or null",
      "revised_sentence": "string or null",
      "reason": "critique in professor voice",
      "action": "concrete action in professor voice",
      "evidence_chunk_ids": ["rule_id or chunk_id"],
      "expression": "SMILE | QUESTION | SERIOUS | WARNING"
    }}
  ],
  "professor_feedback_summary": "Comprehensive overall revision review in professor voice",
  "unresolved_items": ["list of remaining issues"]
}}
"""

        raw_json_str = await self._call_gemini_json(user_prompt)
        parsed_data = self._clean_and_parse_json(raw_json_str)

        # 리포트 조립 및 점수 계산
        criterion_results_data = parsed_data.get("criterion_results", [])
        criterion_results = []

        total_score_before = 0
        total_score_after = 0

        for item in criterion_results_data:
            c_res = CriterionComparisonResult(**item)
            c_res.score_delta = c_res.score_after - c_res.score_before
            if c_res.max_score > 0 and c_res.achievement_rate == 0.0:
                c_res.achievement_rate = round((c_res.score_after / c_res.max_score) * 100.0, 1)
            criterion_results.append(c_res)
            total_score_before += c_res.score_before
            total_score_after += c_res.score_after

        total_delta = total_score_after - total_score_before
        growth_rate = 0.0
        if total_score_before > 0:
            growth_rate = round((total_delta / total_score_before) * 100.0, 1)
        elif total_score_after > 0:
            growth_rate = 100.0

        report = VersionComparisonReport(
            assignment_id=assignment_id,
            base_version=normalized_sub.base_version_no,
            target_version=normalized_sub.target_version_no,
            overall_growth_rate=growth_rate,
            total_score_before=total_score_before,
            total_score_after=total_score_after,
            total_score_delta=total_delta,
            criterion_results=criterion_results,
            professor_feedback_summary=parsed_data.get("professor_feedback_summary", ""),
            unresolved_items=parsed_data.get("unresolved_items", []),
        )

        logger.info(
            "버전 비교 평가 완료: 총점 %d점 ➔ %d점 (변화량: %+d점, 성장률: %.1f%%)",
            total_score_before,
            total_score_after,
            total_delta,
            growth_rate,
        )
        return report

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
                        {"text": f"{_COMPARISON_SYSTEM_PROMPT}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
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
                        raise ValueError("Gemini가 빈 비교 응답을 반환했습니다.")
                elif resp.status_code == 429:
                    logger.warning("[Gemini 429 Rate Limit] 25초 대기 후 자동 재개합니다... (%d/5)", attempt + 1)
                    await asyncio.sleep(25.0)
                else:
                    raise RuntimeError(f"Gemini API 오류 ({resp.status_code}): {resp.text}")
            else:
                raise RuntimeError("Gemini API 429 최대 재시도 횟수 초과")

    @staticmethod
    def _clean_and_parse_json(text: str) -> dict:
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
            raise ValueError(f"JSON 파싱 실패: {e}\n원본: {text[:300]}")
