"""
schemas.py
학생 답변 데이터 및 교육 자료 정규화, 1:N 다회차 버전 체인,
비교 평가(Phase 2E) 데이터 모델 정의 (Pydantic v2).
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ── 1. 문장 단위 Diff 및 학생 제출본 정규화 스키마 ────────────────────────────

class SentenceDiff(BaseModel):
    """문장 단위의 정밀 변경점 (Myers diff 결과)"""

    diff_type: Literal["ADDED", "DELETED", "MODIFIED", "UNCHANGED"] = Field(
        description="문장 변경 유형",
    )
    sentence_index: int = Field(default=0, description="문장 순번")
    before_text: Optional[str] = Field(default=None, description="수정 전 원본 문장")
    after_text: Optional[str] = Field(default=None, description="수정 후 문장")
    target_criterion_id: Optional[str] = Field(
        default=None,
        description="이 문장 수정이 해결하려는 대상 루브릭 기준 ID",
    )


class ItemResponse(BaseModel):
    """피드백 항목(체크리스트)별 학생의 1:N 개별 응답/해명/질문"""

    response_id: str = Field(description="응답 고유 ID")
    feedback_item_id: str = Field(description="대상 피드백 항목 ID (또는 criterionId)")
    response_type: Literal["REVISION_EXPLANATION", "STUDENT_QUESTION", "CODE_DIFF"] = Field(
        default="REVISION_EXPLANATION",
        description="학생 응답 유형 (수정 설명, 추가 질문, 코드 변경점)",
    )
    content: str = Field(description="학생이 작성한 답변/설명 본문")
    referenced_quote: Optional[str] = Field(default=None, description="학생이 인용한 문장")
    created_at: str = Field(default="", description="응답 작성 시각")


class SubmissionVersion(BaseModel):
    """과제 1개에 대한 N개의 버전 중 단일 버전 (1:N 버전 체인)"""

    assignment_id: str = Field(description="과제 ID")
    version_no: int = Field(default=1, description="버전 번호 (1, 2, 3...)")
    content: str = Field(description="해당 버전의 전체 과제 본문 텍스트")
    word_count: int = Field(default=0, description="단어/글자 수")
    item_responses: List[ItemResponse] = Field(
        default_factory=list,
        description="해당 버전에 첨부된 피드백 항목별 개별 답변들 (1:N)",
    )
    submitted_at: str = Field(default="", description="제출 시각")


class NormalizedSubmission(BaseModel):
    """정규화가 완료된 학생 제출본 및 버전 간 차이점(Delta)"""

    base_version_no: int = Field(description="비교 기준 버전 (예: v1)")
    target_version_no: int = Field(description="비교 대상 버전 (예: v2)")
    sentences_count_before: int = Field(default=0)
    sentences_count_after: int = Field(default=0)
    diff_items: List[SentenceDiff] = Field(
        default_factory=list,
        description="추출된 문장 단위 diff 목록",
    )
    item_responses: List[ItemResponse] = Field(
        default_factory=list,
        description="학생의 항목별 추가 설명 및 질문 목록",
    )


# ── 2. 교육 자료(강의 PDF / 교안) 정규화 스키마 ──────────────────────────────

class NormalizedKnowledgeRule(BaseModel):
    """강의 교안에서 정규화된 핵심 규칙/개념 단위"""

    rule_id: str = Field(description="규칙 고유 ID")
    topic: str = Field(description="관련 주제 (예: Git 브랜치 전략, 커밋 컨벤션)")
    rule_type: Literal["MANDATORY_RULE", "BEST_PRACTICE", "PROHIBITED_ACTION", "CONCEPT_DEFINITION"] = Field(
        description="지식 성격 (필수 규칙, 권장 사항, 금지 행동, 개념 정의)",
    )
    statement: str = Field(description="정규화된 핵심 지식 문장")
    document_source: str = Field(default="", description="출처 문서명")
    page_or_slide: int = Field(default=1, description="페이지 또는 슬라이드 번호")
    chunk_id: str = Field(default="", description="원본 청크 ID")


class NormalizedLectureKnowledge(BaseModel):
    """과목/과제에 대해 정규화된 전체 강의 지식 맵"""

    course_name: str = Field(default="오픈소스 프로그래밍")
    rules: List[NormalizedKnowledgeRule] = Field(default_factory=list)


# ── 3. 교차 비교 및 최종 재평가 결과 스키마 (기능명세 2E절 호환) ──────────────

class CriterionComparisonResult(BaseModel):
    """단일 루브릭 기준에 대한 공식 평가 지표 및 버전 간 비교 결과 (기능명세 2.8절 호환)"""

    criterion_id: str = Field(description="루브릭 기준 ID")
    criterion_name: str = Field(description="루브릭 기준 이름")
    category: Literal["COURSE_SPECIFIC", "GENERAL_ADVICE"] = Field(
        default="COURSE_SPECIFIC",
        description="과목 특화 여부",
    )
    max_score: int = Field(default=30, description="루브릭 만점 배점")
    weight: int = Field(default=33, description="루브릭 가중치 (%)")
    
    # 판정 및 결과
    v1_verdict: Literal["MET", "PARTIAL", "NOT_MET", "UNDETERMINED"] = Field(
        default="NOT_MET",
        description="이전(v1) 판정",
    )
    v2_verdict: Literal["MET", "PARTIAL", "NOT_MET", "UNDETERMINED"] = Field(
        default="MET",
        description="현재(v2) 판정",
    )
    result: Literal["IMPROVED", "MAINTAINED", "REGRESSED", "UNDETERMINED"] = Field(
        description="개선도 판정 결과 (개선, 유지/미해결, 악화, 판단불가)",
    )

    # 점수 지표 (범위 및 성취율)
    score_before: int = Field(default=0, description="이전 버전 점수")
    score_after: int = Field(default=0, description="수정 후 버전 점수")
    score_delta: int = Field(default=0, description="점수 변화량 (+/-)")
    score_min: int = Field(default=0, description="예상 최소 점수")
    score_max: int = Field(default=0, description="예상 최대 점수")
    achievement_rate: float = Field(default=0.0, description="루브릭 성취율 (%)")
    confidence: Literal["HIGH", "MEDIUM", "LOW"] = Field(default="HIGH", description="신뢰도")
    
    # 원문 인용 및 수정 문장
    previous_problem_quote: Optional[str] = Field(default=None, description="v1 문제 원문")
    revised_sentence: Optional[str] = Field(default=None, description="v2 수정 문장")
    
    # 교수 피드백 및 수정 지시 행동
    reason: str = Field(default="", description="교수의 어조로 작성된 상세 평가 이유")
    action: str = Field(default="", description="학생이 다음 단계에서 수행할 구체적인 1가지 수정 행동")
    
    # 강의 근거 인용
    evidence_chunk_ids: List[str] = Field(
        default_factory=list,
        description="판단 근거로 활용된 강의자료 청크/규칙 ID 목록",
    )
    expression: Literal["DEFAULT", "SMILE", "QUESTION", "SERIOUS", "WARNING"] = Field(
        default="DEFAULT",
        description="캐릭터 표정 코드",
    )


class VersionComparisonReport(BaseModel):
    """최종 1:N 버전 비교 및 종합 재평가 리포트 (기능명세 2E절)"""

    assignment_id: str = Field(default="")
    base_version: int = Field(description="비교 기준 버전 (예: 1)")
    target_version: int = Field(description="비교 대상 버전 (예: 2)")
    
    # 종합 판정 요약
    overall_growth_rate: float = Field(default=0.0, description="종합 개선율 (%)")
    total_score_before: int = Field(default=0)
    total_score_after: int = Field(default=0)
    total_score_delta: int = Field(default=0)
    
    # 항목별 세부 비교 결과 리스트
    criterion_results: List[CriterionComparisonResult] = Field(default_factory=list)
    
    # 교수 페르소나 총평
    professor_feedback_summary: str = Field(
        default="",
        description="교수의 고유 어조로 작성된 종합 재평가 코멘트",
    )
    
    # 미해결된 잔여 체크리스트 (v3로 이월될 항목들)
    unresolved_items: List[str] = Field(default_factory=list)
