"""
pipeline.py
메인 오케스트레이터: PDFSummarizerPipeline.
Parse → Clean → Chunk → Map(병렬) → Reduce 전체 파이프라인을 조율한다.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Union


from .chunker import SlideChunker
from .cleaner import NoiseFilter
from .config import PipelineConfig, settings
from .extractor import ChunkExtractor
from .parser import PDFParser
from .reducer import SummaryReducer
from .schemas import PipelineResult, SlideChunk

logger = logging.getLogger(__name__)


class PDFSummarizerPipeline:
    """
    강의 슬라이드 PDF를 입력받아 고밀도 계층적 Markdown 요약을 반환한다.

    사용 예시::

        pipeline = PDFSummarizerPipeline()
        result = await pipeline.process_pdf("lecture.pdf")
        print(result.final_summary)
    """

    def __init__(self, config: PipelineConfig | None = None) -> None:
        self._config = config or settings
        self._config.validate()

        # 컴포넌트 초기화
        self._parser = PDFParser(
            title_font_size_threshold=self._config.title_font_size_threshold,
            concurrency_limit=self._config.concurrency_limit,
        )
        self._cleaner = NoiseFilter(min_chars=self._config.noise_min_chars)
        self._chunker = SlideChunker(
            min_slides=self._config.chunk_min_slides,
            max_slides=self._config.chunk_max_slides,
            max_tokens=self._config.chunk_max_tokens,
        )
        self._extractor = ChunkExtractor(
            concurrency_limit=self._config.concurrency_limit,
        )
        self._reducer = SummaryReducer()

    # ── public ──────────────────────────────────────────────────────────────

    async def process_pdf(
        self, pdf_source: Union[str, bytes]
    ) -> PipelineResult:
        """
        PDF를 처리해 PipelineResult를 반환한다.

        Args:
            pdf_source: PDF 파일 경로(str) 또는 PDF 바이트 데이터(bytes).

        Returns:
            PipelineResult (total_pages, processed_chunks, final_summary).

        Raises:
            RuntimeError: 파이프라인의 어느 단계에서든 복구 불가 오류 발생 시.
        """
        start_time = time.monotonic()
        logger.info("═" * 60)
        logger.info("PDF 요약 파이프라인 시작")

        # ── Stage 1: Parse ────────────────────────────────────────────────
        logger.info("[1/4] PDF 파싱 중...")
        try:
            slides = await self._parser.parse_async(pdf_source)
        except Exception as exc:
            raise RuntimeError(f"[파싱 실패] {exc}") from exc

        total_pages = len(slides)
        logger.info("      총 페이지: %d", total_pages)

        # ── Stage 2: Clean ────────────────────────────────────────────────
        logger.info("[2/4] 노이즈 필터링 중...")
        try:
            cleaned_slides = self._cleaner.clean(slides)
        except Exception as exc:
            raise RuntimeError(f"[클리닝 실패] {exc}") from exc

        valid_count = sum(1 for s in cleaned_slides if not s.is_empty_or_noise)
        logger.info("      유효 슬라이드: %d / %d", valid_count, total_pages)

        if valid_count == 0:
            logger.warning("유효한 슬라이드가 없습니다. 빈 요약을 반환합니다.")
            return PipelineResult(
                total_pages=total_pages,
                processed_chunks=0,
                final_summary="*유효한 슬라이드 내용을 찾을 수 없습니다.*",
            )

        # ── Stage 3: Chunk ────────────────────────────────────────────────
        logger.info("[3/4] 청킹 중...")
        try:
            chunks: list[SlideChunk] = self._chunker.chunk(cleaned_slides)
        except Exception as exc:
            raise RuntimeError(f"[청킹 실패] {exc}") from exc

        logger.info("      생성된 청크: %d개", len(chunks))

        # ── Stage 4: Map (병렬 추출) ─────────────────────────────────────
        total_chunks = len(chunks)
        logger.info("[4a/4] Map 요약 추출 중 (병렬, 총 %d개 청크)...", total_chunks)
        completed_chunks = 0
        chunk_lock = asyncio.Lock()

        async def _extract_with_log(chunk: SlideChunk) -> str:
            nonlocal completed_chunks
            res = await self._extractor.extract(chunk)
            async with chunk_lock:
                completed_chunks += 1
                logger.info(
                    "      [%d/%d] 청크 #%d (슬라이드 %d~%d) 요약 완료",
                    completed_chunks,
                    total_chunks,
                    chunk.chunk_id + 1,
                    chunk.start_page,
                    chunk.end_page,
                )
            return res

        try:
            chunk_summaries: list[str] = await asyncio.gather(
                *[_extract_with_log(chunk) for chunk in chunks],
                return_exceptions=False,
            )
        except Exception as exc:
            raise RuntimeError(f"[Map 추출 실패] {exc}") from exc

        logger.info("      Map 추출 완료: %d개 청크 요약 생성", len(chunk_summaries))

        # ── Stage 5: Reduce (합성) ────────────────────────────────────────
        logger.info("[4b/4] Reduce 합성 중...")
        page_ranges = [(c.start_page, c.end_page) for c in chunks]
        try:
            final_summary = await self._reducer.reduce(chunk_summaries, page_ranges)
        except Exception as exc:
            raise RuntimeError(f"[Reduce 합성 실패] {exc}") from exc

        elapsed = time.monotonic() - start_time
        logger.info("파이프라인 완료: %.2f초 소요", elapsed)
        logger.info("═" * 60)

        return PipelineResult(
            total_pages=total_pages,
            processed_chunks=len(chunks),
            final_summary=final_summary,
        )
