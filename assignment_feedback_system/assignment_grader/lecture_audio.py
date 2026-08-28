from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from assignment_grader.schemas import LectureAudioAnalysis

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
TRANSCRIPT_PATH = WORKSPACE_ROOT / "scholarly-affection" / "transcript.txt"


def analyze_mock_lecture_audio(
    *,
    professor_id: str,
    professor_name: str,
    department: str,
    subject: str,
    uploaded_audio_name: str,
    uploaded_audio_size: int,
) -> LectureAudioAnalysis:
    transcript = TRANSCRIPT_PATH.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    transcript_lines = [line.strip() for line in transcript.splitlines() if line.strip()]
    diarized = "\n".join(f"[Speaker 1 (Professor)]: {line}" for line in transcript_lines)

    return LectureAudioAnalysis(
        professor_id=professor_id,
        professor_transcript=transcript,
        full_diarized_transcript=diarized,
        summary=(
            "소프트웨어 중심 사회의 배경, 컴퓨터의 범용성, 알고리즘과 프로그래밍 언어의 관계, "
            "정렬 예시를 통한 문제 해결과 효율성을 설명하는 입문 강의입니다."
        ),
        persona_profile={
            "professor_name": professor_name,
            "department": department,
            "subject": subject,
            "summary_bio": (
                "실생활과 산업 사례에서 출발해 개념을 단계적으로 풀어내고, 반복과 확인 질문으로 "
                "학습자의 이해를 이끄는 친근한 설명형 교수입니다."
            ),
            "dna": {
                "sentence_endings": [
                    "~라고 보시면 됩니다",
                    "~하는 겁니다",
                    "~할 거예요",
                    "~잖아요",
                    "~라고 했죠",
                    "~해보겠습니다",
                ],
                "filler_words": ["예를 들어", "그래서", "결국에는", "어쨌든", "잘 생각해보시면", "이제"],
                "tone_description": (
                    "권위적으로 단정하기보다 청중에게 말을 거는 친근한 구어체를 사용합니다. "
                    "익숙한 사례를 먼저 제시하고 핵심 개념으로 수렴하는 설명형 톤이 두드러집니다."
                ),
                "sentence_structure": (
                    "긴 설명형 복문 사이에 짧은 확인 질문을 배치하고, 같은 개념을 표현만 바꾸어 반복합니다."
                ),
                "criticism_style": (
                    "잘못된 가정이나 한계를 질문으로 드러낸 뒤 구체적인 절차와 대안을 다시 설명합니다."
                ),
                "praise_style": (
                    "학습자가 패턴을 발견했는지 확인하고 다음 단계로 자연스럽게 진입시키는 방식입니다."
                ),
                "forbidden_phrases": [
                    "전반적으로 좋은 시도였습니다",
                    "도움이 되셨기를 바랍니다",
                    "종합적으로 고려해 보세요",
                    "AI 어시스턴트로서",
                ],
            },
        },
        source_file_name="transcript.txt",
        uploaded_audio_name=uploaded_audio_name,
        uploaded_audio_size=uploaded_audio_size,
        character_count=len(transcript),
        line_count=len(transcript_lines),
        extracted_at=datetime.now(timezone.utc).isoformat(),
        engine="Mock AudioProfessorExtractor · transcript.txt",
    )
