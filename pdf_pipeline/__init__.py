"""
pdf_pipeline
============
강의 슬라이드 PDF를 고밀도 계층적 Markdown 요약으로 변환하는 파이프라인 패키지.

패키지를 import하면 의존성이 자동으로 확인·설치된다.

빠른 시작::

    import asyncio
    from pdf_pipeline import PDFSummarizerPipeline

    async def main():
        pipeline = PDFSummarizerPipeline()
        result = await pipeline.process_pdf("lecture.pdf")
        print(result.final_summary)

    asyncio.run(main())
"""



from .config import PipelineConfig, settings
from .installer import REQUIRED_PACKAGES, PackageSpec, ensure_from_requirements
from .pipeline import PDFSummarizerPipeline
from .schemas import PipelineResult, SlideChunk, SlideData

__all__ = [
    "PDFSummarizerPipeline",
    "PipelineConfig",
    "PipelineResult",
    "SlideChunk",
    "SlideData",
    "settings",
    # installer 공개 API
    "ensure_dependencies",
    "ensure_from_requirements",
    "REQUIRED_PACKAGES",
    "PackageSpec",
]
