"""
extractor.py
LLM Map 단계: 청크별 고밀도 Markdown 추출 (Chain of Density 원칙).
AsyncOpenAI를 사용해 병렬 처리를 지원한다.
"""

import asyncio
import logging

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .config import settings
from .schemas import SlideChunk

logger = logging.getLogger(__name__)

# ── 프롬프트 ────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert academic note-taker and knowledge distiller.
Your task is to extract a high-density, information-rich summary from lecture slide content.

STRICT RULES:
1. Extract ONLY core definitions, mechanisms, algorithms, mathematical formulas, key contrasts, and critical concepts.
2. EXCLUDE all conversational filler, motivational remarks, introductory sentences, redundant real-world analogies, and transitional phrases.
3. Output format: strict, hierarchical Markdown bullets (use "##" for topic headings, "-" for bullets, indented sub-bullets for details).
4. Preserve technical terminology exactly as written.
5. If a formula or equation appears in the text, reproduce it faithfully using Markdown code blocks or LaTeX notation.
6. Do NOT add any commentary, preamble, or closing remarks outside the Markdown structure.
"""

_USER_PROMPT_TEMPLATE = """\
Below is the raw text extracted from lecture slides {slide_range}.
Extract a high-density Markdown summary following the system rules.

--- SLIDE CONTENT BEGIN ---
{content}
--- SLIDE CONTENT END ---
"""


class ChunkExtractor:
    """청크 하나를 받아 고밀도 Markdown 요약을 반환하는 Map 추출기."""

    def __init__(
        self,
        concurrency_limit: int | None = None,
    ) -> None:
        self._semaphore = asyncio.Semaphore(
            concurrency_limit or settings.concurrency_limit
        )

    # ── public ──────────────────────────────────────────────────────────────

    async def extract(self, chunk: SlideChunk) -> str:
        """
        단일 SlideChunk를 LLM에 전달해 고밀도 Markdown 요약을 반환한다.

        Args:
            chunk: 처리할 SlideChunk.

        Returns:
            고밀도 Markdown 문자열.
        """
        slide_range = f"(Slides {chunk.start_page}–{chunk.end_page})"
        user_prompt = _USER_PROMPT_TEMPLATE.format(
            slide_range=slide_range,
            content=chunk.combined_text,
        )

        logger.debug("Map 추출 시작: 청크 #%d %s", chunk.chunk_id, slide_range)
        async with self._semaphore:
            result = await self._call_llm(user_prompt)
        logger.debug(
            "Map 추출 완료: 청크 #%d, 출력 %d자",
            chunk.chunk_id,
            len(result),
        )
        return result

    # ── private ─────────────────────────────────────────────────────────────

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
    async def _call_llm(self, user_prompt: str) -> str:
        """Gemini REST API를 호출한다. tenacity로 재시도 처리."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.map_model}:generateContent?key={settings.gemini_api_key}"
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
                "maxOutputTokens": settings.max_tokens_map,
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as http_client:
            for attempt in range(5):
                resp = await http_client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    await asyncio.sleep(1.5)
                    break
                elif resp.status_code == 429:
                    logger.warning("[Map 추출 429 Rate Limit] 25초 대기 후 자동 재시도합니다...")
                    await asyncio.sleep(25.0)
                else:
                    raise RuntimeError(f"Gemini API 오류 ({resp.status_code}): {resp.text}")
            else:
                raise RuntimeError("Map 추출 429 Rate Limit 최대 재시도 초과")

        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise ValueError("LLM이 빈 응답을 반환했습니다.")

        return content.strip()
