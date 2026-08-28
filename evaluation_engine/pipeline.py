"""
pipeline.py
학생 1:N 버전 체인 및 교육 자료 정규화 기반 통합 재평가 파이프라인.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .comparator import KnowledgeComparator
from .normalizer import KnowledgeNormalizer, SubmissionNormalizer
from .schemas import (
    NormalizedLectureKnowledge,
    NormalizedSubmission,
    SubmissionVersion,
    VersionComparisonReport,
)

logger = logging.getLogger(__name__)


class EvaluationPipeline:
    """학생 1:N 답변 정규화 ⟷ 교육 자료 정규화 ⟷ 상호 비교 평가 파이프라인"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.5-flash-lite",
    ) -> None:
        self.comparator = KnowledgeComparator(api_key=api_key, model_name=model_name)

    async def evaluate_version_chain_async(
        self,
        assignment_id: str,
        base_version: SubmissionVersion,
        target_version: SubmissionVersion,
        raw_lecture_chunks: List[Dict[str, Any]],
        rubric_criteria: List[Dict[str, Any]],
        previous_feedback_items: List[Dict[str, Any]],
        professor_persona_prompt: str = "",
    ) -> VersionComparisonReport:
        """
        1. 학생 v1 ➔ v2 제출본 및 1:N 응답 정규화 (문장 단위 Myers Diff)
        2. 교육 자료(PDF 청크) 정규화
        3. 정규화 데이터 교차 검증 및 성장률 계산
        """
        logger.info("[1/3] 학생 답변 및 1:N 변경점 정규화 중 (v%d ➔ v%d)...", base_version.version_no, target_version.version_no)
        norm_submission = SubmissionNormalizer.normalize_versions(
            base_version=base_version,
            target_version=target_version,
        )

        logger.info("[2/3] 강의 교안/슬라이드 지식 규칙 정규화 중 (%d개 청크)...", len(raw_lecture_chunks))
        norm_knowledge = KnowledgeNormalizer.normalize_lecture_chunks(
            chunks=raw_lecture_chunks,
        )

        logger.info("[3/3] 정규화 지식 ⟷ 학생 답변 교차 검증 및 재평가 실행 중...")
        report = await self.comparator.compare_versions_async(
            assignment_id=assignment_id,
            normalized_sub=norm_submission,
            normalized_knowledge=norm_knowledge,
            rubric_criteria=rubric_criteria,
            previous_feedback_items=previous_feedback_items,
            professor_persona_prompt=professor_persona_prompt,
        )

        return report
