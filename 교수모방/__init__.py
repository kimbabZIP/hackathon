"""
교수모방 패키지: 교수 대사 기반 페르소나 역공학 및 과제 첨삭 프롬프트 생성 엔진
"""

from .schemas import (
    AssignmentContext,
    FeedbackItem,
    FeedbackResponseContract,
    GeneralAdviceItem,
    LinguisticDNA,
    ProfessorPersonaProfile,
    SituationExemplar,
)
from .persona_extractor import PersonaExtractor
from .prompt_synthesizer import PromptSynthesizer
from .feedback_simulator import FeedbackSimulator

__all__ = [
    "AssignmentContext",
    "LinguisticDNA",
    "SituationExemplar",
    "ProfessorPersonaProfile",
    "FeedbackItem",
    "GeneralAdviceItem",
    "FeedbackResponseContract",
    "PersonaExtractor",
    "PromptSynthesizer",
    "FeedbackSimulator",
]
