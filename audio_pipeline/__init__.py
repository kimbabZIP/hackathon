"""
audio_pipeline 패키지: 오디오 음성 인식, 화자 분리, 교수 화자 자동 식별 및 대사 추출 모듈
"""

from .extractor import (
    AudioExtractionResult,
    AudioProfessorExtractor,
    SpeakerInfo,
    SUPPORTED_AUDIO_EXTENSIONS,
)

__all__ = [
    "AudioExtractionResult",
    "AudioProfessorExtractor",
    "SpeakerInfo",
    "SUPPORTED_AUDIO_EXTENSIONS",
]
