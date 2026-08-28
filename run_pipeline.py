"""
run_pipeline.py
강의 슬라이드 PDF → 고밀도 Markdown 요약 파이프라인 (Google Gemini 기반).

사용법:
    # .env 파일에 GEMINI_API_KEY 설정 후 실행
    python run_pipeline.py lecture.pdf

    # 또는 환경변수 직접 지정
    $env:GEMINI_API_KEY="your_api_key_here..."
    python run_pipeline.py lecture.pdf --output summary.md
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

_here = Path(__file__).parent
sys.path.insert(0, str(_here))

# .env 파일 지원 (python-dotenv 설치 시)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from pdf_pipeline import PDFSummarizerPipeline, PipelineConfig


def setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


async def main(pdf_path: str, output_path: str | None, verbose: bool) -> None:
    setup_logging(verbose)
    logger = logging.getLogger(__name__)

    path = Path(pdf_path)
    if not path.exists():
        logger.error("파일을 찾을 수 없습니다: %s", pdf_path)
        sys.exit(1)

    logger.info("파일 로드: %s (%.1f MB)", path.name, path.stat().st_size / 1_048_576)

    pipeline = PDFSummarizerPipeline()
    result = await pipeline.process_pdf(str(path))

    print("\n" + "═" * 60)
    print(f"  총 페이지      : {result.total_pages}")
    print(f"  처리된 청크    : {result.processed_chunks}")
    print(f"  요약 길이      : {len(result.final_summary)}자")
    print("═" * 60 + "\n")

    if output_path:
        out = Path(output_path)
        out.write_text(result.final_summary, encoding="utf-8")
        logger.info("요약 저장 완료: %s", out)
    else:
        print(result.final_summary)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="강의 슬라이드 PDF → Markdown 요약",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python run_pipeline.py lecture.pdf
  python run_pipeline.py lecture.pdf -o summary.md
  python run_pipeline.py lecture.pdf -o summary.md -v
        """,
    )
    # nargs="?" → 인수 없이 실행해도 SystemExit 대신 None 반환
    parser.add_argument(
        "pdf",
        nargs="?",
        default=None,
        help="처리할 PDF 파일 경로",
    )
    parser.add_argument("-o", "--output", help="출  력 Markdown 파일 경로 (미지정 시 stdout)")
    parser.add_argument("-v", "--verbose", action="store_true", help="상세 로그 출력")

    args = parser.parse_args()

    # PDF 경로가 지정되지 않은 경우 → 직접 입력받기 (더블클릭 실행 대응)
    if args.pdf is None:
        print("=" * 60)
        print("  강의 슬라이드 PDF → Markdown 요약 파이프라인")
        print("=" * 60)
        try:
            pdf_input = input("\nPDF 파일 경로를 입력하세요\n(예: C:\\Users\\user\\lecture.pdf)\n> ").strip().strip('"')
        except (EOFError, KeyboardInterrupt):
            print("\n[종료]")
            sys.exit(0)

        if not pdf_input:
            print("[오류] 경로가 입력되지 않았습니다.")
            input("\nEnter를 눌러 종료...")
            sys.exit(0)

        args.pdf = pdf_input

        # 출력 파일 경로도 입력받기
        try:
            out_input = input("\n결과를 저장할 파일 경로 (그냥 Enter 시 화면에 출력)\n> ").strip().strip('"')
            args.output = out_input if out_input else None
        except (EOFError, KeyboardInterrupt):
            args.output = None

    asyncio.run(main(args.pdf, args.output, args.verbose))

    # 더블클릭 실행 시 창이 바로 닫히지 않도록 대기
    if sys.stdin and sys.stdin.isatty():
        input("\n작업 완료. Enter를 눌러 종료...")
