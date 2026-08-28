"""
chunker.py
슬라이드 인식(Slide-aware) + 토큰 제한 기반 청킹.
유효한 SlideData를 5~10개 단위로 묶고 토큰 초과 시 조기 분할한다.
"""

from __future__ import annotations

import logging
import re

from .config import settings
from .schemas import SlideChunk, SlideData

logger = logging.getLogger(__name__)


def _rough_token_count(text: str) -> int:
    """
    LLM 토크나이저 없이 빠른 근사 토큰 수를 반환한다.
    영문 기준 평균 4자/토큰, 한글 기준 평균 2자/토큰을 혼합 근사.
    """
    # 한글 문자 수
    korean_chars = len(re.findall(r"[\uAC00-\uD7A3]", text))
    other_chars = len(text) - korean_chars
    return int(korean_chars / 2 + other_chars / 4)


class SlideChunker:
    """유효 SlideData 리스트를 SlideChunk 리스트로 변환한다."""

    def __init__(
        self,
        min_slides: int | None = None,
        max_slides: int | None = None,
        max_tokens: int | None = None,
    ) -> None:
        self._min_slides = min_slides or settings.chunk_min_slides
        self._max_slides = max_slides or settings.chunk_max_slides
        self._max_tokens = max_tokens or settings.chunk_max_tokens

    # ── public ──────────────────────────────────────────────────────────────

    def chunk(self, slides: list[SlideData]) -> list[SlideChunk]:
        """
        유효 슬라이드만 추려 청크로 묶는다.

        Args:
            slides: NoiseFilter 출력 SlideData 리스트.

        Returns:
            SlideChunk 리스트.
        """
        valid_slides = [s for s in slides if not s.is_empty_or_noise]

        if not valid_slides:
            logger.warning("유효한 슬라이드가 없습니다. 청크를 생성하지 않습니다.")
            return []

        chunks: list[SlideChunk] = []
        chunk_id = 0
        i = 0

        while i < len(valid_slides):
            window: list[SlideData] = []
            token_acc = 0

            while i < len(valid_slides):
                slide = valid_slides[i]
                slide_text = self._slide_to_text(slide)
                slide_tokens = _rough_token_count(slide_text)

                # 토큰 초과: 이미 최소 슬라이드 수를 채웠으면 청크 완료
                if token_acc + slide_tokens > self._max_tokens and len(window) >= self._min_slides:
                    break

                window.append(slide)
                token_acc += slide_tokens
                i += 1

                # 최대 슬라이드 수 도달
                if len(window) >= self._max_slides:
                    break

            if not window:
                # 단일 슬라이드가 토큰 제한을 초과하는 엣지 케이스: 그냥 포함
                window = [valid_slides[i]]
                i += 1

            chunk = self._build_chunk(chunk_id, window)
            chunks.append(chunk)
            logger.debug(
                "청크 #%d 생성: 슬라이드 %d~%d (%d개, ~%d 토큰)",
                chunk_id,
                chunk.start_page,
                chunk.end_page,
                len(window),
                _rough_token_count(chunk.combined_text),
            )
            chunk_id += 1

        logger.info(
            "청킹 완료: 유효 슬라이드 %d개 → 청크 %d개",
            len(valid_slides),
            len(chunks),
        )
        return chunks

    # ── private ─────────────────────────────────────────────────────────────

    @staticmethod
    def _slide_to_text(slide: SlideData) -> str:
        """SlideData를 사람이 읽기 좋은 텍스트로 변환한다."""
        parts: list[str] = []
        if slide.title:
            parts.append(f"## {slide.title}")
        if slide.body:
            parts.append(slide.body)
        return "\n".join(parts)

    def _build_chunk(self, chunk_id: int, window: list[SlideData]) -> SlideChunk:
        """SlideData 윈도우를 SlideChunk로 변환한다."""
        start_page = window[0].page_number
        end_page = window[-1].page_number

        slide_texts = [self._slide_to_text(s) for s in window]
        body = "\n\n---\n\n".join(slide_texts)

        # 메타데이터 프리픽스 삽입
        prefix = f"[Slides {start_page}–{end_page}]\n\n"
        combined_text = prefix + body

        return SlideChunk(
            chunk_id=chunk_id,
            start_page=start_page,
            end_page=end_page,
            combined_text=combined_text,
        )
