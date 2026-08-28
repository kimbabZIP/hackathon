from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    login_id: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=256)
    display_name: str = Field(min_length=1, max_length=50)
    email: str | None = Field(default=None, max_length=320)


class UserLoginRequest(BaseModel):
    login_id: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=256)


class AuthUser(BaseModel):
    id: str
    login_id: str
    display_name: str
    email: str | None = None
    role: Literal["student", "admin"]
    status: Literal["pending", "active", "locked", "suspended", "deleted"]
    created_at: str


class AuthResponse(BaseModel):
    user: AuthUser


class ProfessorProfileUpsert(BaseModel):
    template_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=25, le=100)
    department: str = Field(min_length=1, max_length=200)
    lab_name: str | None = Field(default=None, max_length=200)
    specialty: str = Field(min_length=1, max_length=300)
    personality_type: str | None = Field(default=None, max_length=100)
    traits: str | None = Field(default=None, max_length=1_000)
    representative_quote: str | None = Field(default=None, max_length=1_000)
    difficulty: int = Field(default=3, ge=1, le=5)
    make_active: bool = True


class ProfessorProfileRecord(BaseModel):
    id: str
    owner_user_id: str
    template_id: str | None = None
    name: str
    age: int | None = None
    department: str
    lab_name: str | None = None
    specialty: str
    personality_type: str | None = None
    traits: str | None = None
    representative_quote: str | None = None
    difficulty: int
    affection: int
    stress: int
    status: Literal["active", "archived", "deleted"]
    created_at: str
    updated_at: str
    deleted_at: str | None = None
    is_active: bool = False
    persona_profile: dict[str, Any] | None = None


class CriterionResult(BaseModel):
    name: str
    score: int = Field(ge=0)
    max_score: int = Field(gt=0)
    feedback: str
    evidence: str = ""


class LineEdit(BaseModel):
    original: str
    revised: str
    reason: str


class FeedbackReport(BaseModel):
    title: str = "과제 첨삭 결과"
    total_score: int = Field(ge=0, le=100)
    grade: str
    summary: str
    criteria: list[CriterionResult]
    strengths: list[str]
    priorities: list[str]
    misconceptions: list[str]
    line_edits: list[LineEdit]
    improved_example: str
    engine: str = "local"
    caution: str = "자동 첨삭 결과는 교수자의 최종 판단을 보조하는 자료입니다."


class GradeRequest(BaseModel):
    lecture_summary: str = Field(min_length=20, max_length=100_000)
    assignment_prompt: str = Field(min_length=5, max_length=30_000)
    student_submission: str = Field(min_length=5, max_length=100_000)


class ProfessorChatMessage(BaseModel):
    role: Literal["student", "professor"]
    content: str = Field(min_length=1, max_length=4_000)


class ProfessorChatPersona(BaseModel):
    professor_name: str = Field(min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=200)
    subject: str = Field(min_length=1, max_length=300)
    summary_bio: str = Field(min_length=1, max_length=2_000)
    tone_description: str = Field(default="전문적이고 따뜻한 지도 교수의 어조", max_length=2_000)
    sentence_endings: list[str] = Field(default_factory=list, max_length=8)
    filler_words: list[str] = Field(default_factory=list, max_length=8)


class ProfessorChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12_000)
    history: list[ProfessorChatMessage] = Field(default_factory=list, max_length=6)
    persona: ProfessorChatPersona
    professor_id: str | None = Field(default=None, min_length=1, max_length=200)


class LectureMaterialRecord(BaseModel):
    id: str
    owner_user_id: str | None = None
    professor_id: str
    content_sha256: str | None = None
    cache_hit: bool = False
    title: str
    file_name: str
    file_size: int = Field(ge=0)
    total_pages: int = Field(ge=0)
    processed_chunks: int = Field(ge=0)
    summary: str
    engine: str
    created_at: str


class LectureAudioAnalysis(BaseModel):
    professor_id: str
    professor_transcript: str
    full_diarized_transcript: str
    summary: str
    persona_profile: dict[str, Any]
    source_file_name: str = Field(min_length=1, max_length=500)
    uploaded_audio_name: str
    uploaded_audio_size: int = Field(ge=0)
    character_count: int = Field(ge=0)
    line_count: int = Field(ge=0)
    extracted_at: str
    engine: str


class ProfessorChatContextSource(BaseModel):
    material_id: str
    title: str
    file_name: str


class ProfessorChatTraceStep(BaseModel):
    name: str
    model: str | None = None
    latency_ms: float | None = None
    tokens: int | None = None
    status: str | None = None
    output: str | None = None


class ProfessorChatExecutionTrace(BaseModel):
    pipeline_name: str
    intent: str
    total_latency_ms: float
    steps: list[ProfessorChatTraceStep]


class ProfessorChatTokenUsage(BaseModel):
    prompt_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class ProfessorChatResponse(BaseModel):
    type: Literal["CHAT"] = "CHAT"
    reply: str
    intent: Literal["CASUAL_CHAT", "ACADEMIC_QA", "ASSIGNMENT_EVAL"]
    confidence: float = Field(ge=0, le=1)
    expression: Literal["normal", "strict", "smile", "thoughtful", "surprised"] = "normal"
    tokens: ProfessorChatTokenUsage = Field(default_factory=ProfessorChatTokenUsage)
    execution_trace: ProfessorChatExecutionTrace
    context_sources: list[ProfessorChatContextSource] = Field(default_factory=list)
    engine: str
    caution: str = ""
