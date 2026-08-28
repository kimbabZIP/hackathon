"""
cleaner.py
노이즈 필터링 및 정규식 기반 텍스트 정제.
반복 헤더/푸터, 페이지 번호, 저작권 표시, 의미 없는 슬라이드를 제거한다.
"""

from __future__ import annotations

import logging
import re

from .config import settings
from .schemas import SlideData

logger = logging.getLogger(__name__)

# ── 정규식 패턴 ─────────────────────────────────────────────────────────────

# 제거 대상 인라인 패턴 (대소문자 무시)
_STRIP_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"page\s*\d+\s*/\s*\d+", re.IGNORECASE),       # Page 12/100
    re.compile(r"\bslide\s*\d+\s*/\s*\d+", re.IGNORECASE),     # Slide 3/50
    re.compile(r"copyright\s*©.*", re.IGNORECASE),              # Copyright © ...
    re.compile(r"©\s*\d{4}.*"),                                  # © 2024 ...
    re.compile(r"all rights reserved.*", re.IGNORECASE),         # All rights reserved
    re.compile(r"confidential.*", re.IGNORECASE),                # Confidential
    re.compile(r"^\s*\d+\s*$", re.MULTILINE),                   # 단독 숫자 줄 (페이지 번호)
    re.compile(r"http[s]?://\S+"),                               # URL 제거
]

# 노이즈 슬라이드 판정 키워드 (제목 또는 전체 텍스트 기준)
_NOISE_TITLE_KEYWORDS: frozenset[str] = frozenset(
    {
        "q&a", "questions", "thank you", "thanks", "any questions",
        "discussion", "break", "course overview", "agenda",
        "outline", "table of contents", "contents", "references",
        "bibliography", "acknowledgement", "acknowledgments",
        "contact", "end", "fin", "that's all",
    }
)


class NoiseFilter:
    """SlideData 리스트에서 노이즈를 제거하고 본문을 정제한다."""

    def __init__(self, min_chars: int | None = None) -> None:
        self._min_chars = min_chars if min_chars is not None else settings.noise_min_chars

    # ── public ──────────────────────────────────────────────────────────────

    def clean(self, slides: list[SlideData]) -> list[SlideData]:
        """
        슬라이드 리스트를 정제한다.
        - 인라인 노이즈 패턴 제거
        - 노이즈 슬라이드 플래그 설정 (is_empty_or_noise=True)

        Args:
            slides: PDFParser 출력 SlideData 리스트.

        Returns:
            정제된 SlideData 리스트 (원본 리스트 변경 없이 새 객체 반환).
        """
        cleaned: list[SlideData] = []
        noise_count = 0

        for slide in slides:
            cleaned_slide = self._clean_slide(slide)
            cleaned.append(cleaned_slide)
            if cleaned_slide.is_empty_or_noise:
                noise_count += 1

        logger.info(
            "노이즈 필터 완료: 총 %d슬라이드, 노이즈 %d개 (%.1f%%)",
            len(slides),
            noise_count,
            100 * noise_count / len(slides) if slides else 0,
        )
        return cleaned

    # ── private ─────────────────────────────────────────────────────────────

    def _clean_slide(self, slide: SlideData) -> SlideData:
        """단일 슬라이드를 정제한 새 SlideData를 반환한다."""
        # 이미 파서가 노이즈로 표시한 슬라이드는 그대로 통과
        if slide.is_empty_or_noise:
            return slide

        cleaned_body = self._strip_noise_patterns(slide.body)
        cleaned_title = self._strip_noise_patterns(slide.title or "").strip() or None

        # 노이즈 여부 판정
        is_noise = self._is_noise_slide(
            title=cleaned_title,
            body=cleaned_body,
        )

        return SlideData(
            page_number=slide.page_number,
            title=cleaned_title,
            body=cleaned_body,
            raw_text=slide.raw_text,
            is_empty_or_noise=is_noise,
        )

    @staticmethod
    def _strip_noise_patterns(text: str) -> str:
        """정규식 패턴으로 노이즈 문자열을 제거한 텍스트를 반환한다."""
        for pattern in _STRIP_PATTERNS:
            text = pattern.sub("", text)
        # 3개 이상 연속 공백/줄바꿈 정규화
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)
        return text.strip()

    def _is_noise_slide(self, title: str | None, body: str) -> bool:
        """슬라이드가 노이즈인지 판정한다."""
        combined = f"{title or ''} {body}".strip()

        # 1. 전체 텍스트가 너무 짧은 경우
        if len(combined) < self._min_chars:
            logger.debug("노이즈 판정 (텍스트 길이 부족): %r", combined[:60])
            return True

        # 2. 제목이 노이즈 키워드와 일치하는 경우
        if title:
            title_lower = title.lower().strip()
            if title_lower in _NOISE_TITLE_KEYWORDS:
                logger.debug("노이즈 판정 (제목 키워드): %r", title)
                return True

        # 3. 전체 텍스트가 노이즈 키워드로만 구성된 경우
        combined_lower = combined.lower().strip()
        if combined_lower in _NOISE_TITLE_KEYWORDS:
            logger.debug("노이즈 판정 (전체 텍스트 키워드): %r", combined[:60])
            return True

        return False
