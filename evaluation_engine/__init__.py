"""
evaluation_engine 패키지: 학생 답변 정규화 및 교육자료 정규화 기반 비교 평가 시스템
"""

from .schemas import (
    CriterionComparisonResult,
    ItemResponse,
    NormalizedKnowledgeRule,
    NormalizedLectureKnowledge,
    NormalizedSubmission,
    SentenceDiff,
    SubmissionVersion,
    VersionComparisonReport,
)
from .normalizer import KnowledgeNormalizer, SubmissionNormalizer
from .comparator import KnowledgeComparator
from .pipeline import EvaluationPipeline

__all__ = [
    "SentenceDiff",
    "ItemResponse",
    "SubmissionVersion",
    "NormalizedSubmission",
    "NormalizedKnowledgeRule",
    "NormalizedLectureKnowledge",
    "CriterionComparisonResult",
    "VersionComparisonReport",
    "SubmissionNormalizer",
    "KnowledgeNormalizer",
    "KnowledgeComparator",
    "EvaluationPipeline",
]
