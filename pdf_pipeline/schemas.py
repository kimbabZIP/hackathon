"""
schemas.py
Pydantic v2 데이터 모델 정의.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class SlideData(BaseModel):
    """단일 슬라이드(페이지)의 파싱 결과."""

    page_number: int = Field(..., description="1-based 페이지 번호")
    title: Optional[str] = Field(None, description="슬라이드 제목 (largest/big font 블록)")
    body: str = Field(default="", description="제목 이외의 본문 텍스트")
    raw_text: str = Field(default="", description="정제 전 원본 텍스트 (줄바꿈 포함)")
    is_empty_or_noise: bool = Field(
        default=False,
        description="노이즈/빈 슬라이드 여부 (True이면 청킹에서 제외)",
    )


class SlideChunk(BaseModel):
    """연속된 유효 슬라이드를 묶은 청크."""

    chunk_id: int = Field(..., description="0-based 청크 인덱스")
    start_page: int = Field(..., description="청크 시작 페이지 번호 (1-based)")
    end_page: int = Field(..., description="청크 종료 페이지 번호 (1-based, inclusive)")
    combined_text: str = Field(..., description="메타데이터 프리픽스 포함 결합 텍스트")


class PipelineResult(BaseModel):
    """파이프라인 최종 결과."""

    total_pages: int = Field(..., description="PDF 전체 페이지 수")
    processed_chunks: int = Field(..., description="실제 처리된 청크 수")
    final_summary: str = Field(..., description="최종 계층적 Markdown 요약")
