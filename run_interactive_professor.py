"""
run_interactive_professor.py
일상 대화 ⟷ 과제 첨삭 자동 전환 교수 AI 트윈 대화형 CLI.
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

from 교수모방 import ProfessorPersonaProfile, AssignmentContext
from 교수모방.interactive_agent import InteractiveProfessorAgent

logger = logging.getLogger("interactive_agent")


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


# ── 기본 출제 과제 프리셋 목록 ─────────────────────────────────────────────

PRESET_ASSIGNMENTS = {
    "1": AssignmentContext(
        assignment_id="assign_git_01",
        title="3장 깃 브랜치 전략 및 커밋 컨벤션 과제",
        description="main 직접 push 금지, feature 브랜치 분기, Conventional Commits 규칙 준수 및 README 작성",
        lecture_chunks=[
            {
                "chunkId": "chunk_git_01",
                "title": "3장 버전 관리와 커밋 컨벤션",
                "content": "커밋 메시지는 변경 이유와 영향을 명확히 작성해야 하며 Conventional Commits를 준수해야 한다. '수정함' 등의 모호한 메시지는 금지된다.",
            },
            {
                "chunkId": "chunk_git_02",
                "title": "3.1 브랜치 전략 및 충돌 해결",
                "content": "main 브랜치 직접 push는 엄격히 금지된다. 반드시 feature 브랜치를 생성하여 Pull Request 및 코드 리뷰를 거쳐 병합해야 한다.",
            },
        ],
        rubric_criteria=[
            {"criterionId": "crit_commit", "name": "커밋 메시지 규칙 준수", "maxScore": 50},
            {"criterionId": "crit_branch", "name": "브랜치 분기 전략", "maxScore": 50},
        ],
    ),
    "2": AssignmentContext(
        assignment_id="assign_hw_io",
        title="컴퓨터 구조: 입출력 장치 심층 분석 과제",
        description="입력장치와 출력장치의 차이를 명확히 구분하고, 각 장치의 동작 원리와 예시를 기술할 것 (모니터는 출력장치임)",
        lecture_chunks=[
            {
                "chunkId": "chunk_io_01",
                "title": "2장 컴퓨터 하드웨어 - 입력장치와 출력장치",
                "content": "입력장치(마우스, 키보드, 스캐너, 마이크 등)는 데이터를 컴퓨터로 전달하는 장치이며, 모니터, 프린터, 스피커는 출력장치이다.",
            }
        ],
        rubric_criteria=[
            {"criterionId": "crit_io_classify", "name": "입출력 장치 구분 및 팩트 정확성", "maxScore": 50},
            {"criterionId": "crit_io_depth", "name": "장치별 동작 원리 기술 충실도", "maxScore": 50},
        ],
    ),
}


async def run_chat_loop(persona_path: str) -> None:
    path = Path(persona_path)
    if not path.exists():
        logger.error("페르소나 JSON 파일을 찾을 수 없습니다: %s", persona_path)
        sys.exit(1)

    profile_data = json.loads(path.read_text(encoding="utf-8"))
    profile = ProfessorPersonaProfile(**profile_data)

    agent = InteractiveProfessorAgent(profile=profile)

    print("\n" + "=" * 70)
    print(f"🎓 [{profile.professor_name} 교수님 연구실 // 전자동 과제 검증 & 대화 콘솔]")
    print(f"• 학과: {profile.department} | 과목: {profile.subject}")
    print(f"• 성향: {profile.summary_bio}")
    print("• 상태: ⚡ [과제 주제 자동 감지 & Myers Diff 정규화 팩트체크 상시 가동 중]")
    print("=" * 70)
    print("💡 평소처럼 편하게 질문이나 인사를 하시다가,")
    print("   과제를 제출하시면 AI가 과제 주제(Git, 입출력장치, 알고리즘 등)를 스스로 파악하여")
    print("   기능명세 2.8절의 루브릭 지표로 즉시 자동 첨삭합니다! (종료: 'exit')\n")

    total_accumulated_tokens = 0

    while True:
        try:
            user_input = input("\n[학생] > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "q"]:
                print(f"\n[{profile.professor_name} 교수]: 허허, 그래. 오늘 하루도 고생 많았고 밥 든든하게 챙겨 먹게나!")
                break

            response = await agent.interact_async(
                student_message=user_input,
            )

            tokens = response.get("tokens", {})
            used_tokens = tokens.get("total_tokens", 0)
            total_accumulated_tokens += used_tokens
            trace = response.get("execution_trace", {})

            # ── 실시간 텔레메트리 (Execution Trace) 출력 ────────────────────
            pipe_name = trace.get("pipeline_name", "Multi-Agent Dual-Stage Pipeline")
            intent_label = trace.get("intent", "UNKNOWN")
            total_latency = trace.get("total_latency_ms", 0.0)

            print("\n" + "=" * 70)
            print(f"⚡ [Execution Trace / 런타임 텔레메트리]")
            print(f"• 가동 파이프라인 : {pipe_name}")
            print(f"• 분류된 의도     : {intent_label}")
            print(f"• 총 응답 지연시간 : {total_latency} ms")
            
            steps_str = []
            for s in trace.get("steps", []):
                ms = s.get("latency_ms")
                ms_text = f" ({ms}ms)" if ms is not None else ""
                steps_str.append(f"{s.get('name')}{ms_text}")
            
            if steps_str:
                print(f"• 실행 체인 흐름  : {' ➔ '.join(steps_str)}")
            print("=" * 70)

            if response["type"] == "CHAT":
                expr = response.get("expression", "DEFAULT")
                print(f"\n[{profile.professor_name} 교수] ({expr}):")
                print(f"  {response['reply']}")
                print(f"\n  🏷️ [토큰 현황] 이번 발화: {used_tokens:,} tokens | 세션 누적: {total_accumulated_tokens:,} tokens (무료 티어: 일일 100만 토큰 한도)")
            else:
                report = response["report"]
                print(f"\n📋 [{profile.professor_name} 교수님의 과제 첨삭 평가 리포트 가동!]")
                print("-" * 70)
                print(f"• 총점 변화: {report.get('score_before', 0)}점 ➔ {report.get('score_after', 0)}점 (성장률: {report.get('growth_rate', 0.0):.1f}%)")
                print("-" * 70)

                for crit in report.get("criterion_results", []):
                    status_icon = "✅" if crit.get("verdict_after") == "MET" else "⚠️"
                    print(f"{status_icon} [{crit.get('criterion_name')}] 판정: {crit.get('result_code')} ({crit.get('score_before', 0)}➔{crit.get('score_after', 0)}점)")
                    print(f"   • 교수 평가: {crit.get('reason', '')}")
                    print(f"   • 수정 지시: {crit.get('action', '')}")

                print(f"\n🎓 [교수님 총평]:\n{response.get('summary', '')}")
                print(f"\n  🏷️ [토큰 현황] 이번 발화: {used_tokens:,} tokens | 세션 누적: {total_accumulated_tokens:,} tokens (무료 티어: 일일 100만 토큰 한도)")

        except (KeyboardInterrupt, EOFError):
            print("\n대화를 종료합니다.")
            break


def main() -> None:
    parser = argparse.ArgumentParser(description="교수 AI 트윈 인터랙티브 대화형 CLI")
    parser.add_argument(
        "persona",
        nargs="?",
        default="교수모방/professor_persona.json",
        help="교수 페르소나 JSON 파일 경로",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="상세 로그 출력")
    args = parser.parse_args()

    setup_logging(args.verbose)
    asyncio.run(run_chat_loop(args.persona))


if __name__ == "__main__":
    main()
