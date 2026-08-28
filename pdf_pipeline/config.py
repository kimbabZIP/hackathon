"""
config.py
환경변수 및 파이프라인 기본값 설정.
.env 파일 또는 시스템 환경변수에서 값을 읽는다.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass
class PipelineConfig:
    # ── API Key 및 엔드포인트 ───────────────────────────────────────────────
    # Gemini API Key (또는 OpenAI API Key)
    gemini_api_key: str = field(
        default_factory=lambda: os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("OPENAI_API_KEY", "")
    )
    # Gemini OpenAI 호환 엔드포인트 URL
    api_base_url: str = field(
        default_factory=lambda: os.environ.get(
            "API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"
        )
    )

    # ── 모델 설정 ───────────────────────────────────────────────────────────
    # Map 단계 (청크별 상세 추출) 에 사용할 모델
    map_model: str = field(
        default_factory=lambda: os.environ.get("MAP_MODEL", "gemini-3.5-flash-lite")
    )
    # Reduce 단계 (전체 합성) 에 사용할 모델
    reduce_model: str = field(
        default_factory=lambda: os.environ.get("REDUCE_MODEL", "gemini-3.5-flash-lite")
    )
    # Vision OCR 모델 (이미지 기반 PDF에 사용)
    vision_model: str = field(
        default_factory=lambda: os.environ.get("VISION_MODEL", "gemini-3.5-flash-lite")
    )

    # LLM 호출 온도 (0 = 결정론적)
    llm_temperature: float = field(
        default_factory=lambda: float(os.environ.get("LLM_TEMPERATURE", "0.2"))
    )
    # 응답 최대 토큰
    max_tokens_map: int = field(
        default_factory=lambda: int(os.environ.get("MAX_TOKENS_MAP", "2048"))
    )
    max_tokens_reduce: int = field(
        default_factory=lambda: int(os.environ.get("MAX_TOKENS_REDUCE", "4096"))
    )
    max_tokens_vision: int = field(
        default_factory=lambda: int(os.environ.get("MAX_TOKENS_VISION", "1024"))
    )

    # ── 동시성 제어 (Gemini Free Tier 15 RPM 한도 방지) ─────────────────────
    concurrency_limit: int = field(
        default_factory=lambda: int(os.environ.get("CONCURRENCY_LIMIT", "2"))
    )

    # ── 청킹 ────────────────────────────────────────────────────────────────
    # 청크 당 최소/최대 슬라이드 수
    chunk_min_slides: int = field(
        default_factory=lambda: int(os.environ.get("CHUNK_MIN_SLIDES", "5"))
    )
    chunk_max_slides: int = field(
        default_factory=lambda: int(os.environ.get("CHUNK_MAX_SLIDES", "10"))
    )
    # 청크 당 최대 토큰 수 (초과 시 슬라이드 수를 줄임)
    chunk_max_tokens: int = field(
        default_factory=lambda: int(os.environ.get("CHUNK_MAX_TOKENS", "3000"))
    )

    # ── 파서 ────────────────────────────────────────────────────────────────
    # 제목으로 분류할 최소 폰트 크기 (pt)
    title_font_size_threshold: float = field(
        default_factory=lambda: float(os.environ.get("TITLE_FONT_SIZE_THRESHOLD", "16.0"))
    )
    # 페이지 렌더링 DPI (권장: 150)
    render_dpi: int = field(
        default_factory=lambda: int(os.environ.get("RENDER_DPI", "150"))
    )

    # ── 재시도 ──────────────────────────────────────────────────────────────
    retry_attempts: int = field(
        default_factory=lambda: int(os.environ.get("RETRY_ATTEMPTS", "5"))
    )
    retry_wait_seconds: float = field(
        default_factory=lambda: float(os.environ.get("RETRY_WAIT_SECONDS", "3.0"))
    )

    # ── 노이즈 필터 ─────────────────────────────────────────────────────────
    noise_min_chars: int = field(
        default_factory=lambda: int(os.environ.get("NOISE_MIN_CHARS", "30"))
    )

    def validate(self) -> None:
        """필수 설정값 검증. 파이프라인 시작 전 호출."""
        if not self.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. "
                ".env 파일에 GEMINI_API_KEY=your_api_key_here... 를 추가해주세요.\n"
                "무료 키 발급: https://aistudio.google.com/app/apikey"
            )


# 모듈 임포트 시 자동 생성되는 싱글턴 설정 객체
settings = PipelineConfig()
