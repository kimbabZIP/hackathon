"""
schemas.py
교수 페르소나 역공학 및 과제 첨삭 엔진의 데이터 모델 정의 (Pydantic v2).
기능명세서 2.8절의 LLM 구조화 출력 계약을 완벽히 지원합니다.
"""

from __future__ import annotations

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


# ── 언어학적 특징 DNA 스키마 ───────────────────────────────────────────────

class LinguisticDNA(BaseModel):
    """대사에서 역공학된 교수의 언어학적 지표"""

    # 1. 어미 습관
    sentence_endings: List[str] = Field(
        default_factory=list,
        description="교수가 문장을 끝맺을 때 자주 쓰는 고유 어미 패턴 (예: ~인 거지요, ~거든?, ~하십시오)",
    )
    # 2. 간투사 및 습관어
    filler_words: List[str] = Field(
        default_factory=list,
        description="문장 서두나 중간에 습관적으로 넣는 추임새 및 간투사 (예: 자,, 어... 그니까, 사실상, 주목하세요)",
    )
    # 3. 전반적 톤앤매너
    tone_description: str = Field(
        default="전문적이고 학술적인 어조",
        description="전반적인 대화 톤 (예: 친근하고 따뜻한 격려형, 직설적이고 날카로운 원칙형 등)",
    )
    # 4. 문장 호흡 및 구조
    sentence_structure: str = Field(
        default="균형 잡힌 문장 구조",
        description="문장의 길이 및 호흡 (예: 만연체 복문 위주, 단호하고 짧은 단문 위주 등)",
    )
    # 5. 비판 및 지적 전달 방식
    criticism_style: str = Field(
        default="핵심 오류를 명확히 지적",
        description="학생의 부족한 점을 짚을 때의 특유의 화법 (예: 소크라테스식 반문, 먼저 공감 후 지적, 단도직입적 지적)",
    )
    # 6. 칭찬 및 격려 전달 방식
    praise_style: str = Field(
        default="우수한 점을 인정",
        description="과제의 잘된 부분을 칭찬할 때의 특유의 화법 (예: 과장 없는 담백한 인정, 열정적인 찬사 등)",
    )
    # 7. 네거티브 지침 (절대 쓰지 말아야 할 기계적 표현)
    forbidden_phrases: List[str] = Field(
        default_factory=lambda: [
            "~에 대해 알아보았습니다",
            "~하시면 큰 도움이 될 것입니다",
            "전반적으로 좋은 시도였습니다",
            "AI 어시스턴트로서",
        ],
        description="일반적인 AI 챗봇 느낌을 주는 상투적인 표현 목록",
    )


# ── 상황별 골든 퓨샷(Few-shot) 발화 스키마 ───────────────────────────────────

class SituationExemplar(BaseModel):
    """특정 채점 상황에 대응하는 교수의 실제/모방 발화 예시"""

    situation_type: Literal["MET", "PARTIAL", "NOT_MET", "QUESTION"] = Field(
        description="루브릭 채점 상황 (충족, 부분 충족, 미흡/경고, 의문/탐색)",
    )
    context_description: str = Field(
        description="어떤 상황에 대한 피드백인지에 대한 설명 (예: 깃 브랜치 전략 충돌 지적)",
    )
    exemplar_speech: str = Field(
        description="교수의 실제 어투와 호흡이 고스란히 담긴 피드백 문장 예시",
    )


# ── 출제 과제 컨텍스트 스키마 ────────────────────────────────────────────────

class AssignmentContext(BaseModel):
    """교수가 출제한 과제의 세부 정보 컨텍스트"""

    assignment_id: str = Field(..., description="과제 식별자 (예: assign_hw_01)")
    title: str = Field(..., description="과제 제목 (예: 컴퓨터 구조: 입출력 장치 심층 분석)")
    description: str = Field(
        default="",
        description="교수가 내준 과제 지침 및 상세 요구사항 (예: 입력장치와 출력장치를 구분하고 원리를 서술할 것)",
    )
    rubric_criteria: List[dict] = Field(
        default_factory=list,
        description="이 과제에 부여된 루브릭 채점 기준 목록",
    )
    lecture_chunks: List[dict] = Field(
        default_factory=list,
        description="이 과제와 관련된 강의 교안 지식 청크 목록",
    )
    # 생성 시각 및 메타데이터
    created_at: str = Field(default="")


# ── 교수 페르소나 통합 프로필 스키마 ─────────────────────────────────────────

class ProfessorPersonaProfile(BaseModel):
    """분석 완료된 교수의 전체 페르소나 프로필"""

    professor_name: str = Field(default="미확정 교수", description="교수 이름")
    department: str = Field(default="미확정 학과", description="소속 학과")
    subject: str = Field(default="강의 과목", description="담당 과목")
    summary_bio: str = Field(default="", description="교수의 주요 성향 및 강의 스타일 한 줄 요약")
    
    # 핵심 언어 DNA
    dna: LinguisticDNA = Field(default_factory=LinguisticDNA)
    
    # 상황별 골든 발화 예시들
    exemplars: List[SituationExemplar] = Field(default_factory=list)
    
    # 생성 시각 및 메타데이터
    created_at: str = Field(default="")


# ── 기능명세서 2.8절 LLM 구조화 피드백 출력 계약 스키마 ───────────────────────

class FeedbackItem(BaseModel):
    """과제 루브릭별 단일 피드백 항목 (기능명세 2.8절)"""

    criterionId: str = Field(description="루브릭 기준 ID (예: crit_1, crit_2 또는 UUID)")
    category: Literal["COURSE_SPECIFIC", "GENERAL_ADVICE"] = Field(
        default="COURSE_SPECIFIC",
        description="과목 특화 피드백 여부",
    )
    verdict: Literal["MET", "PARTIAL", "NOT_MET", "UNDETERMINED"] = Field(
        description="루브릭 충족도 판정",
    )
    submissionQuote: str = Field(
        description="제출물에서 지적 대상이 된 실제 원본 문장 (정확히 일치해야 함)",
    )
    reason: str = Field(
        description="교수의 고유 말투로 작성된 평가 및 지적 이유",
    )
    evidenceChunkIds: List[str] = Field(
        default_factory=list,
        description="강의자료에서 인용한 근거 chunk ID 리스트",
    )
    action: str = Field(
        description="교수의 고유 말투로 지시하는 학생이 수행할 구체적인 1가지 수정 행동",
    )
    scoreMin: int = Field(default=0, description="최소 예상 점수")
    scoreMax: int = Field(default=0, description="최대 예상 점수")
    confidence: Literal["HIGH", "MEDIUM", "LOW"] = Field(
        default="HIGH",
        description="피드백 신뢰도",
    )
    expression: Literal["DEFAULT", "SMILE", "QUESTION", "SERIOUS", "WARNING"] = Field(
        default="DEFAULT",
        description="SVG 캐릭터와 연동될 교수의 표정 코드",
    )


class GeneralAdviceItem(BaseModel):
    """일반적인 글쓰기 조언 (기능명세 2.8절)"""

    submissionQuote: str = Field(description="제출물의 실제 문장")
    reason: str = Field(description="교수 말투의 일반적인 글쓰기 판단")
    action: str = Field(description="구체적인 수정 행동")
    expression: Literal["DEFAULT", "SMILE", "QUESTION", "SERIOUS", "WARNING"] = Field(
        default="QUESTION",
    )


class FeedbackResponseContract(BaseModel):
    """기능명세 2.8절의 최종 피드백 JSON 응답 구조"""

    items: List[FeedbackItem] = Field(default_factory=list)
    generalAdvice: List[GeneralAdviceItem] = Field(default_factory=list)
