"""
run_evaluation_pipeline.py
학생 1:N 답변 정규화 ⟷ 교육 자료 정규화 ⟷ 상호 비교 평가(Phase 2E) CLI 실행기.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# Windows UTF-8 콘솔 인코딩
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# .env 로드
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from evaluation_engine import (
    EvaluationPipeline,
    ItemResponse,
    SubmissionVersion,
)

logger = logging.getLogger("eval_pipeline")


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


# ── 샘플 데이터: v1 초안 vs v2 수정본 (1:N 답변 포함) ────────────────────────

SAMPLE_SUBMISSION_V1 = """\
[과제 제목: 깃 브랜치 전략 설계 및 소스트리 활용 보고서 (v1 초안)]
작성자: 20261234 홍길동

1. 커밋 관리 방안
코드 작업 도중 버그가 발생하여 커밋 메시지를 '수정함', 'bug fix'로 통일하여 빠르게 커밋하였습니다.

2. 브랜치 전략
저희 팀은 개발 속도를 높이기 위해 feature 브랜치를 따로 분기하지 않고, 모든 팀원이 main 브랜치에 직접 커밋 및 push를 진행하였습니다. 충돌이 발생하면 최신 코드를 덮어쓰기 방식으로 해결했습니다.

3. 리드미(README) 작성
프로젝트 코드가 직관적이므로 별도의 실행 환경 및 빌드 가이드는 작성하지 않았습니다.
"""

SAMPLE_SUBMISSION_V2 = """\
[과제 제목: 깃 브랜치 전략 설계 및 소스트리 활용 보고서 (v2 수정본)]
작성자: 20261234 홍길동

1. 커밋 관리 방안
커밋 메시지 규칙을 전면 개편하였습니다. Conventional Commits 규칙에 따라 'feat: 사용자 로그인 API 추가', 'fix: 토큰 만료 버그 수정'과 같이 변경 목적과 영향 범위를 명확히 작성하였습니다.

2. 브랜치 전략
저희 팀은 개발 속도를 위해 main 브랜치에 직접 커밋 및 push를 진행하였습니다. 다만 충돌 시 덮어쓰기 대신 팀원 간 구두로 확인 후 덮어쓰도록 규칙을 바꿨습니다.

3. 리드미(README) 작성
README에 '본 프로젝트는 매우 훌륭한 시스템입니다'라는 소개 문구만 한 줄 추가하였습니다.
"""

# 학생이 피드백 항목별로 남긴 1:N 개별 코멘트/답변
SAMPLE_ITEM_RESPONSES = [
    ItemResponse(
        response_id="resp_01",
        feedback_item_id="crit_commit_convention",
        response_type="REVISION_EXPLANATION",
        content="교수님 지적대로 커밋 메시지에 'feat:', 'fix:' prefix를 도입하고 상세 내용을 적도록 전면 수정했습니다!",
        referenced_quote="커밋 메시지 규칙을 전면 개편하였습니다...",
    ),
    ItemResponse(
        response_id="resp_02",
        feedback_item_id="crit_branch_strategy",
        response_type="STUDENT_QUESTION",
        content="교수님, feature 브랜치 만드는 게 번거로워서 main에서 팀원끼리 말로 합의보고 push하면 안 되나요?",
        referenced_quote="다만 충돌 시 덮어쓰기 대신 팀원 간 구두로 확인 후...",
    ),
]

SAMPLE_RUBRICS = [
    {
        "criterionId": "crit_commit_convention",
        "name": "커밋 메시지 규칙 준수",
        "description": "커밋 메시지가 변경 의도와 내용을 명확하게 설명하고 규칙을 준수하는가",
        "maxScore": 30,
    },
    {
        "criterionId": "crit_branch_strategy",
        "name": "브랜치 분기 및 충돌 방지 전략",
        "description": "main 직접 push를 금지하고 feature 브랜치 분기 및 안전한 병합 전략을 적용했는가",
        "maxScore": 40,
    },
    {
        "criterionId": "crit_readme_completeness",
        "name": "README 문서화 완성도",
        "description": "빌드 방법, 실행 환경, 프로젝트 개요가 명확히 기술되었는가",
        "maxScore": 30,
    },
]

SAMPLE_PREVIOUS_FEEDBACK = [
    {
        "criterionId": "crit_commit_convention",
        "verdict": "NOT_MET",
        "score": 5,
        "submissionQuote": "커밋 메시지를 '수정함', 'bug fix'로 통일하여 빠르게 커밋하였습니다.",
        "reason": "커밋 메시지에 변경 의도가 전혀 없음.",
        "action": "어떤 파일을 왜 고쳤는지 명확하게 커밋 메시지를 다시 작성할 것.",
    },
    {
        "criterionId": "crit_branch_strategy",
        "verdict": "NOT_MET",
        "score": 5,
        "submissionQuote": "모든 팀원이 main 브랜치에 직접 커밋 및 push를 진행하였습니다.",
        "reason": "main 직접 push는 충돌 위험이 크며 엄격히 금지됨.",
        "action": "feature 브랜치를 따서 PR을 올리는 방식으로 변경할 것.",
    },
    {
        "criterionId": "crit_readme_completeness",
        "verdict": "NOT_MET",
        "score": 0,
        "submissionQuote": "별도의 실행 환경 및 빌드 가이드는 작성하지 않았습니다.",
        "reason": "README에 빌드 및 실행 가이드가 전혀 없음.",
        "action": "프로젝트 개요, 빌드 방법, 실행 가이드를 상세히 채워 넣을 것.",
    },
]

SAMPLE_LECTURE_CHUNKS = [
    {
        "chunkId": "chunk_git_01",
        "title": "3장 버전 관리와 커밋 컨벤션",
        "page_no": 12,
        "document_name": "3깃_강의교안.pdf",
        "content": "커밋 메시지는 변경 이유와 영향을 명확히 작성해야 하며 Conventional Commits(feat, fix, docs)를 준수해야 한다. '수정함' 등의 모호한 메시지는 금지된다.",
    },
    {
        "chunkId": "chunk_git_02",
        "title": "3.1 브랜치 전략 및 충돌 해결",
        "page_no": 28,
        "document_name": "3깃_강의교안.pdf",
        "content": "main 브랜치 직접 push는 엄격히 금지된다. 구두 합의는 불인정되며, 반드시 feature 브랜치를 생성하여 Pull Request 및 코드 리뷰를 거쳐 병합해야 한다.",
    },
    {
        "chunkId": "chunk_git_03",
        "title": "3.2 프로젝트 문서화 가이드",
        "page_no": 45,
        "document_name": "3깃_강의교안.pdf",
        "content": "README에는 반드시 사전 요구사항(Prerequisites), 설치 명령어(npm install / pip install), 실행 가이드가 명시되어야 한다. 단순 홍보 문구는 감점 대상이다.",
    },
]


async def run_eval_pipeline(
    v1_path: str = "student_v1.txt",
    v2_path: str = "student_v2.txt",
) -> None:
    logger.info("════════════════════════════════════════════════════════════")
    logger.info("학생 답변 정규화 ⟷ 교육 자료 정규화 ⟷ 상호 비교 평가 시작")
    logger.info("════════════════════════════════════════════════════════════")

    # 파일에서 학생 제출본 읽기
    p1 = Path(v1_path)
    p2 = Path(v2_path)

    v1_text = p1.read_text(encoding="utf-8") if p1.exists() else SAMPLE_SUBMISSION_V1
    v2_text = p2.read_text(encoding="utf-8") if p2.exists() else SAMPLE_SUBMISSION_V2

    logger.info("• v1 파일 로드: %s (%d 글자)", p1.name, len(v1_text))
    logger.info("• v2 파일 로드: %s (%d 글자)", p2.name, len(v2_text))

    # 1. 버전 객체 생성 (1:N 다중 답변 포함)
    v1 = SubmissionVersion(
        assignment_id="assign_git_01",
        version_no=1,
        content=v1_text,
        word_count=len(v1_text),
        submitted_at="2026-08-27 10:00:00",
    )

    v2 = SubmissionVersion(
        assignment_id="assign_git_01",
        version_no=2,
        content=v2_text,
        word_count=len(v2_text),
        item_responses=SAMPLE_ITEM_RESPONSES,
        submitted_at="2026-08-28 09:30:00",
    )

    # 2. 교수 페르소나 로드 (있을 경우)
    persona_prompt = "교수 특유의 구수하고 직설적인 화법(~구먼, ~단 말일세, 음식/일상 비유)으로 피드백을 전달하십시오."
    persona_path = Path("교수모방/synthesized_system_prompt.txt")
    if persona_path.exists():
        persona_prompt = persona_path.read_text(encoding="utf-8")

    # 3. 파이프라인 실행
    pipeline = EvaluationPipeline()
    report = await pipeline.evaluate_version_chain_async(
        assignment_id="assign_git_01",
        base_version=v1,
        target_version=v2,
        raw_lecture_chunks=SAMPLE_LECTURE_CHUNKS,
        rubric_criteria=SAMPLE_RUBRICS,
        previous_feedback_items=SAMPLE_PREVIOUS_FEEDBACK,
        professor_persona_prompt=persona_prompt,
    )

    # 4. 결과 출력 (공식 루브릭 평가 지표 형식)
    print("\n" + "=" * 80)
    print(f"📊 [공식 루브릭 평가 지표 & 재평가 대시보드 (v{report.base_version} ➔ v{report.target_version})]")
    print("=" * 80)
    print(f"• 종합 성장률 : {report.overall_growth_rate:+.1f}%")
    print(f"• 총점 변화   : {report.total_score_before}점 ➔ {report.total_score_after}점 (변화량: {report.total_score_delta:+d}점)")
    print("-" * 80)
    print(f"{'루브릭 기준':<20} | {'이전':^7} | {'현재':^7} | {'판정':^9} | {'점수':^12} | {'성취율':^8} | {'표정':^8}")
    print("-" * 80)
    for c in report.criterion_results:
        print(f"{c.criterion_name:<20} | {c.v1_verdict:^7} | {c.v2_verdict:^7} | {c.result:^9} | {c.score_before}➔{c.score_after}점({c.score_delta:+d}) | {c.achievement_rate:>6.1f}% | {c.expression:^8}")
    print("=" * 80 + "\n")

    for idx, c in enumerate(report.criterion_results, 1):
        status_icon = "✅" if c.result == "IMPROVED" else ("⚠️" if c.result == "MAINTAINED" else "❌")
        print(f"[{idx}] {status_icon} 루브릭 지표: [{c.criterion_id}] {c.criterion_name} (배점: {c.max_score}점 / 가중치: {c.weight}%)")
        print(f"    • 판정 전이: {c.v1_verdict} ➔ 【{c.v2_verdict}】 (개선도: {c.result} / 신뢰도: {c.confidence})")
        print(f"    • 획득 점수: {c.score_before}점 ➔ {c.score_after}점 ({c.score_delta:+d}점) [예상범위: {c.score_min}~{c.score_max}점 / 달성률: {c.achievement_rate}%]")
        if c.previous_problem_quote:
            print(f"    • [v1 지적 원문]: \"{c.previous_problem_quote}\"")
        if c.revised_sentence:
            print(f"    • [v2 수정 문장]: \"{c.revised_sentence}\"")
        print(f"    • 교수 평가(Reason): {c.reason}")
        print(f"    • 수정 지시(Action): {c.action}")
        if c.evidence_chunk_ids:
            print(f"    • 강의 근거 ID: {c.evidence_chunk_ids}")
        print()

    print("=" * 70)
    print("🎓 [교수님의 종합 재평가 총평]")
    print("=" * 70)
    print(report.professor_feedback_summary)
    
    if report.unresolved_items:
        print("\n📌 [다음 회차(v3)로 이월된 미해결 과제 목록]:")
        for u in report.unresolved_items:
            print(f"  - {u}")
    print("=" * 70 + "\n")

    # JSON 저장
    output_path = Path("evaluation_engine/comparison_report.json")
    output_path.write_text(json.dumps(report.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("✓ 재평가 리포트 저장 완료: %s", output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="학생 답변 정규화 및 비교 평가 파이프라인")
    parser.add_argument("v1", nargs="?", default="student_v1.txt", help="학생 v1 초안 텍스트 파일 경로")
    parser.add_argument("v2", nargs="?", default="student_v2.txt", help="학생 v2 수정본 텍스트 파일 경로")
    parser.add_argument("-v", "--verbose", action="store_true", help="상세 로그 출력")
    args = parser.parse_args()

    setup_logging(args.verbose)

    # 대화형 안내
    if len(sys.argv) == 1:
        print("=" * 60)
        print("  학생 답변 정규화 ⟷ 교육 자료 비교 평가 시스템")
        print("=" * 60)
        u_v1 = input(f"v1 초안 파일 경로 [기본값: {args.v1}] > ").strip()
        if u_v1:
            args.v1 = u_v1.strip('"').strip("'")
        u_v2 = input(f"v2 수정본 파일 경로 [기본값: {args.v2}] > ").strip()
        if u_v2:
            args.v2 = u_v2.strip('"').strip("'")

    asyncio.run(run_eval_pipeline(v1_path=args.v1, v2_path=args.v2))


if __name__ == "__main__":
    main()
