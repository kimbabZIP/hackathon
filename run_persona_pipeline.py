"""
run_persona_pipeline.py
교수 대사 텍스트 기반 페르소나 역공학 및 과제 첨삭 프롬프트 생성 파이프라인 CLI 실행기.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# Windows UTF-8 콘솔 출력 지원
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

from 교수모방 import (
    FeedbackSimulator,
    PersonaExtractor,
    PromptSynthesizer,
)
from audio_pipeline import AudioProfessorExtractor, SUPPORTED_AUDIO_EXTENSIONS

logger = logging.getLogger("persona_pipeline")


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


# ── 샘플 학생 과제 및 루브릭 데이터 ──────────────────────────────────────────

SAMPLE_STUDENT_SUBMISSION = """\
[과제 제목: 깃(Git) 브랜치 전략 설계 및 소스트리 활용 보고서]
작성자: 20261234 홍길동

1. 커밋 관리 방안
코드 작업 도중 버그가 발생하여 커밋 메시지를 '수정함', 'bug fix'로 통일하여 빠르게 커밋하였습니다.

2. 브랜치 전략
저희 팀은 개발 속도를 높이기 위해 feature 브랜치를 따로 분기하지 않고, 모든 팀원이 main 브랜치에 직접 커밋 및 push를 진행하였습니다. 충돌이 발생하면 최신 코드를 덮어쓰기 방식으로 해결했습니다.

3. 리드미(README) 작성
프로젝트 코드가 직관적이므로 별도의 실행 환경 및 빌드 가이드는 작성하지 않았습니다.
"""

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

SAMPLE_LECTURE_CHUNKS = [
    {
        "chunkId": "chunk_git_01",
        "title": "3장 버전 관리와 커밋 컨벤션",
        "content": "커밋 메시지는 변경 이유와 영향을 명확히 작성해야 하며 '수정함' 등의 모호한 메시지는 금지된다.",
    },
    {
        "chunkId": "chunk_git_02",
        "title": "3.1 브랜치 전략 및 충돌 해결",
        "content": "main 브랜치 직접 push는 엄격히 금지된다. 반드시 feature 브랜치를 생성하여 PR 및 코드 리뷰를 거쳐 병합해야 한다.",
    },
]


async def run_pipeline(
    transcript_path: str,
    prof_name: str,
    department: str,
    subject: str,
    simulate_feedback: bool = True,
) -> None:
    logger.info("════════════════════════════════════════════════════════════")
    logger.info("교수 페르소나 역공학 & 과제 첨삭 프롬프트 생성 파이프라인 시작")
    logger.info("════════════════════════════════════════════════════════════")

    # 1. 파일 검사: 오디오 파일(mp3, wav, m4a 등) vs 텍스트 파일(txt)
    path = Path(transcript_path)
    if not path.exists():
        logger.error("대사 파일을 찾을 수 없습니다: %s", transcript_path)
        sys.exit(1)

    is_audio = AudioProfessorExtractor.is_audio_file(str(path))

    if is_audio:
        print("\n" + "=" * 65)
        print("🎙️ [오디오 음성인식 & 화자 분리(Diarization) 파이프라인 가동]")
        print(f"• 오디오 파일: {path.name} (크기: {path.stat().st_size / (1024*1024):.2f} MB)")
        print("=" * 65)

        audio_extractor = AudioProfessorExtractor()
        audio_result = await audio_extractor.extract_from_audio_async(str(path))

        print("\n👥 [화자 분석 및 역할 식별 결과]:")
        for spk in audio_result.speakers:
            is_prof = spk.speaker_id == audio_result.professor_speaker_id
            icon = "🎓 [교수/강사]" if is_prof else "🧑‍🎓 [학생/참여자]"
            print(f"  • {icon} {spk.speaker_id} ({spk.role}) : {spk.rationale}")

        print(f"\n✓ '교수' 화자({audio_result.professor_speaker_id})의 발화만 100% 필터링 완료! (총 {len(audio_result.professor_transcript)}자)")

        extracted_txt_path = Path("교수모방/extracted_professor_transcript.txt")
        extracted_txt_path.write_text(audio_result.professor_transcript, encoding="utf-8")
        logger.info("✓ 추출된 교수 대사 저장 완료: %s", extracted_txt_path)

        transcript_text = audio_result.professor_transcript
        print("=" * 65 + "\n")
    else:
        transcript_text = path.read_text(encoding="utf-8")
        logger.info("대사 파일 로드: %s (%d 글자)", path.name, len(transcript_text))

    # 2. 페르소나 역공학 실행
    extractor = PersonaExtractor()
    profile = await extractor.extract_from_transcript_async(
        transcript_text=transcript_text,
        professor_name=prof_name,
        department=department,
        subject=subject,
    )

    # 3. 분석된 페르소나 JSON 저장
    output_json_path = Path("교수모방/professor_persona.json")
    output_json_path.parent.mkdir(parents=True, exist_ok=True)
    output_json_path.write_text(
        json.dumps(profile.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info("✓ 페르소나 프로필 저장 완료: %s", output_json_path)

    # 4. 기능명세 호환 시스템 프롬프트 합성
    synthesizer = PromptSynthesizer()
    system_prompt = synthesizer.synthesize_system_prompt(profile)
    output_prompt_path = Path("교수모방/synthesized_system_prompt.txt")
    output_prompt_path.write_text(system_prompt, encoding="utf-8")
    logger.info("✓ 합성된 시스템 프롬프트 저장 완료: %s", output_prompt_path)

    print("\n" + "=" * 60)
    print(f"🎯 [추출된 '{profile.professor_name}' 교수 언어학적 DNA 요약]")
    print("=" * 60)
    print(f"• 성향 요약: {profile.summary_bio}")
    print(f"• 톤앤매너: {profile.dna.tone_description}")
    print(f"• 주요 어미: {', '.join(profile.dna.sentence_endings)}")
    print(f"• 말버릇/간투사: {', '.join(profile.dna.filler_words)}")
    print(f"• 지적/비판 스타일: {profile.dna.criticism_style}")
    print(f"• 칭찬 스타일: {profile.dna.praise_style}")
    print(f"• 금지 표현: {', '.join(profile.dna.forbidden_phrases)}")
    print("=" * 60 + "\n")

    # 5. 실제 학생 과제 첨삭 시뮬레이션
    if simulate_feedback:
        logger.info("▶ 샘플 학생 과제에 대한 '%s' 교수 스타일 실시간 첨삭 시뮬레이션 진행 중...", profile.professor_name)
        simulator = FeedbackSimulator()
        feedback_result = await simulator.evaluate_submission_async(
            profile=profile,
            submission_text=SAMPLE_STUDENT_SUBMISSION,
            rubric_criteria=SAMPLE_RUBRICS,
            lecture_evidence_chunks=SAMPLE_LECTURE_CHUNKS,
        )

        output_feedback_path = Path("교수모방/simulated_feedback_result.json")
        output_feedback_path.write_text(
            json.dumps(feedback_result.model_dump(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info("✓ 첨삭 결과 JSON 저장 완료: %s", output_feedback_path)

        print("\n" + "=" * 70)
        print(f"📝 ['{profile.professor_name}' 교수 말투로 첨삭된 과제 피드백 결과]")
        print("=" * 70)
        for idx, item in enumerate(feedback_result.items, 1):
            print(f"\n[항목 {idx}] 루브릭 기준: {item.criterionId} | 판정: {item.verdict} | 표정: {item.expression}")
            print(f"  • 지적 대상 원본 문장: \"{item.submissionQuote}\"")
            print(f"  • 교수 평가 (Reason): {item.reason}")
            print(f"  • 교수 지시 (Action): {item.action}")
            print(f"  • 예상 점수 범위: {item.scoreMin}점 ~ {item.scoreMax}점 | 신뢰도: {item.confidence}")
            if item.evidenceChunkIds:
                print(f"  • 강의 근거 ID: {item.evidenceChunkIds}")
        
        if feedback_result.generalAdvice:
            print("\n[일반 글쓰기 조언]")
            for adv in feedback_result.generalAdvice:
                print(f"  • {adv.reason} → 행동: {adv.action} (표정: {adv.expression})")
        print("\n" + "=" * 70)


def main() -> None:
    parser = argparse.ArgumentParser(description="교수 대사 기반 페르소나 역공학 및 첨삭 파이프라인")
    parser.add_argument(
        "transcript",
        nargs="?",
        default="교수모방/sample_transcripts/sample_strict_prof.txt",
        help="교수 강의 대사 텍스트 파일 경로",
    )
    parser.add_argument("--name", default="박성진", help="교수 이름")
    parser.add_argument("--dept", default="컴퓨터공학과", help="학과")
    parser.add_argument("--subject", default="오픈소스 소프트웨어 개론", help="과목명")
    parser.add_argument("-v", "--verbose", action="store_true", help="상세 로그 출력")
    args = parser.parse_args()

    setup_logging(args.verbose)

    # 대화형 프롬프트 (인자가 기본값일 때 친절한 안내)
    if len(sys.argv) == 1:
        print("=" * 60)
        print("  교수 페르소나 역공학 & 과제 첨삭 프롬프트 생성기")
        print("=" * 60)
        user_file = input(f"교수 대사 파일 경로 (Enter 시 기본 샘플 사용)\n[기본값: {args.transcript}] > ").strip()
        if user_file:
            args.transcript = user_file.strip('"').strip("'")
        
        user_name = input(f"교수 이름 [기본값: {args.name}] > ").strip()
        if user_name:
            args.name = user_name

    asyncio.run(
        run_pipeline(
            transcript_path=args.transcript,
            prof_name=args.name,
            department=args.dept,
            subject=args.subject,
        )
    )


if __name__ == "__main__":
    main()
