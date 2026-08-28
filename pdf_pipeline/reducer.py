"""
reducer.py
LLM Reduce 단계: 청크별 Map 결과를 계층적 Markdown으로 합성 (Hierarchical Summarization).
청크가 1개면 Map 결과를 그대로 반환한다.
"""

import logging

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .config import settings

logger = logging.getLogger(__name__)

# ── 프롬프트 ────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert academic editor and knowledge synthesizer.
You will receive multiple high-density Markdown summaries from different sections of a lecture.
Your task is to synthesize them into a single, unified, hierarchical Markdown document.

STRICT RULES:
1. Eliminate all redundant definitions, repeated concepts, and duplicate bullet points across sections.
2. Resolve any apparent inconsistencies between sections; preserve the most precise or detailed version.
3. Reorganize content under a coherent hierarchy:
   - H1 (#): Overall lecture title (infer from content if not explicit).
   - H2 (##): Major topic areas or modules.
   - Structured sub-bullets (-) for details, formulas, and key distinctions.
4. Do NOT add any new content, opinions, or commentary beyond what exists in the input summaries.
5. Output ONLY the final Markdown document — no preamble, no meta-commentary.
"""

_USER_PROMPT_TEMPLATE = """\
Below are {n_chunks} high-density section summaries extracted from a lecture.
Synthesize them into a single hierarchical Markdown document following the system rules.

{sections}
"""

_SECTION_TEMPLATE = """\
=== SECTION {idx} (Slides {start}–{end}) ===
{content}
"""


class SummaryReducer:
    """청크 요약 리스트를 최종 계층적 Markdown으로 합성하는 Reduce 합성기."""

    def __init__(self) -> None:
        pass

    # ── public ──────────────────────────────────────────────────────────────

    async def reduce(
        self,
        chunk_summaries: list[str],
        chunk_page_ranges: list[tuple[int, int]],
    ) -> str:
        """
        청크별 Map 요약을 합성해 최종 Markdown을 반환한다.

        Args:
            chunk_summaries: ChunkExtractor.extract() 결과 리스트.
            chunk_page_ranges: 각 청크의 (start_page, end_page) 튜플 리스트.

        Returns:
            최종 계층적 Markdown 문자열.
        """
        if not chunk_summaries:
            raise ValueError("합성할 청크 요약이 없습니다.")

        # 청크가 1개면 Map 결과를 그대로 반환 (불필요한 API 호출 방지)
        if len(chunk_summaries) == 1:
            logger.info("청크 1개: Reduce 단계를 건너뜁니다.")
            return chunk_summaries[0]

        logger.info("Reduce 합성 시작: %d개 청크", len(chunk_summaries))
        result = await self._call_llm(chunk_summaries, chunk_page_ranges)
        logger.info("Reduce 합성 완료: 출력 %d자", len(result))
        return result

    # ── private ─────────────────────────────────────────────────────────────

    def _build_user_prompt(
        self,
        chunk_summaries: list[str],
        chunk_page_ranges: list[tuple[int, int]],
    ) -> str:
        """Reduce 단계 user prompt를 조립한다."""
        sections = []
        for idx, (summary, (start, end)) in enumerate(
            zip(chunk_summaries, chunk_page_ranges), start=1
        ):
            sections.append(
                _SECTION_TEMPLATE.format(idx=idx, start=start, end=end, content=summary)
            )

        return _USER_PROMPT_TEMPLATE.format(
            n_chunks=len(chunk_summaries),
            sections="\n".join(sections),
        )

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(settings.retry_attempts),
        wait=wait_exponential(
            multiplier=settings.retry_wait_seconds,
            min=settings.retry_wait_seconds,
            max=30,
        ),
        reraise=True,
    )
    async def _call_llm(
        self,
        chunk_summaries: list[str],
        chunk_page_ranges: list[tuple[int, int]],
    ) -> str:
        """Gemini REST API를 호출한다. tenacity로 재시도 처리."""
        user_prompt = self._build_user_prompt(chunk_summaries, chunk_page_ranges)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.reduce_model}:generateContent?key={settings.gemini_api_key}"
        headers = {
            "Content-Type": "application/json",
        }

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{_SYSTEM_PROMPT}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": settings.llm_temperature,
                "maxOutputTokens": settings.max_tokens_reduce,
            },
        }

        async with httpx.AsyncClient(timeout=60.0) as http_client:
            resp = await http_client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API 오류 ({resp.status_code}): {resp.text}")
            data = resp.json()

        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise ValueError("LLM Reduce 단계에서 빈 응답을 반환했습니다.")

        return content.strip()
