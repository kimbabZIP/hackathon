from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Literal

from pydantic import BaseModel

from assignment_grader.professor_chat_log import append_professor_chat_record
from assignment_grader.schemas import (
    ProfessorChatContextSource,
    ProfessorChatExecutionTrace,
    ProfessorChatRequest,
    ProfessorChatResponse,
    ProfessorChatTokenUsage,
    ProfessorChatTraceStep,
)

ChatIntent = Literal["CASUAL_CHAT", "ACADEMIC_QA", "ASSIGNMENT_EVAL"]
logger = logging.getLogger(__name__)


class IntentDecision(BaseModel):
    intent: ChatIntent
    confidence: float


class StyledReply(BaseModel):
    reply: str
    expression: Literal["normal", "strict", "smile", "thoughtful", "surprised"] = "normal"


def _history_text(request: ProfessorChatRequest) -> str:
    if not request.history:
        return "(대화 시작)"
    labels = {"student": "학생", "professor": request.persona.professor_name}
    return "\n".join(f"{labels[item.role]}: {item.content}" for item in request.history[-6:])


def _local_intent(message: str) -> IntentDecision:
    normalized = message.strip().casefold()
    assignment_markers = ("과제 제출", "레포트 첨삭", "보고서 첨삭", "채점해", "평가해")
    academic_markers = (
        "왜",
        "어떻게",
        "설명",
        "알고리즘",
        "이론",
        "코드",
        "논문",
        "개념",
        "차이",
        "무엇",
        "인가요",
        "일까요",
        "?",
    )
    if len(normalized) >= 40 and any(marker in normalized for marker in assignment_markers):
        return IntentDecision(intent="ASSIGNMENT_EVAL", confidence=0.82)
    if any(marker in normalized for marker in academic_markers):
        return IntentDecision(intent="ACADEMIC_QA", confidence=0.78)
    return IntentDecision(intent="CASUAL_CHAT", confidence=0.72)


def _pipeline_name(intent: ChatIntent) -> str:
    if intent == "ACADEMIC_QA":
        return "학술 Q&A 2-Stage Professor Engine"
    if intent == "ASSIGNMENT_EVAL":
        return "과제 제출 감지 안내 Pipeline"
    return "일상/멘토링 Professor Chat Pipeline"


def _local_expression(intent: ChatIntent, message: str) -> str:
    if intent == "ASSIGNMENT_EVAL":
        return "strict"
    if intent == "ACADEMIC_QA":
        return "thoughtful"
    if any(word in message for word in ("감사", "좋아", "안녕", "반가")):
        return "smile"
    return "normal"


class LocalProfessorChatEngine:
    name = "로컬 교수 대화 엔진"

    async def chat(self, request: ProfessorChatRequest) -> ProfessorChatResponse:
        started = time.perf_counter()
        decision = _local_intent(request.message)
        persona = request.persona
        message = request.message.strip()

        if decision.intent == "ASSIGNMENT_EVAL":
            reply = (
                f"{message[:30].rstrip()}… 과제 제출로 보이는군. 여기서는 핵심 논점을 함께 짚어볼 수 있지만, "
                "점수와 항목별 수정 지시가 필요하다면 연구실의 ‘과제 첨삭 받기’ 메뉴에 강의 자료와 과제 지시문을 함께 올리게."
            )
        elif decision.intent == "ACADEMIC_QA":
            reply = (
                f"좋은 질문이군. {persona.subject}의 관점에서는 먼저 핵심 개념을 정확히 정의하고, "
                f"그 개념이 실제 사례에서 어떻게 작동하는지 분리해서 보아야 하네. 자네가 말한 ‘{message[:45]}’의 "
                "전제와 결론을 한 문장씩 적어보게. 그러면 어느 연결 고리를 더 설명해야 하는지 분명해질 걸세."
            )
        elif re.search(r"안녕|반갑|처음", message):
            reply = f"어서 오게. 나는 {persona.department}의 {persona.professor_name}일세. 오늘은 {persona.subject}에 관해 무엇이 궁금한가?"
        elif re.search(r"감사|고맙", message):
            reply = "별말을 다 하는군. 직접 생각해 본 흔적이 보여서 나도 기쁘네. 막히는 지점이 생기면 문장 그대로 가져오게."
        else:
            reply = f"그렇군. 자네 이야기를 더 들어보고 싶네. {persona.subject}과 연결해서 지금 가장 마음에 걸리는 지점이 무엇인지 말해보게."

        elapsed = (time.perf_counter() - started) * 1000
        return ProfessorChatResponse(
            reply=reply,
            intent=decision.intent,
            confidence=decision.confidence,
            expression=_local_expression(decision.intent, message),
            execution_trace=ProfessorChatExecutionTrace(
                pipeline_name=_pipeline_name(decision.intent),
                intent=f"{decision.intent} (로컬 신뢰도: {decision.confidence * 100:.1f}%)",
                total_latency_ms=round(elapsed, 1),
                steps=[
                    ProfessorChatTraceStep(
                        name="LocalIntentRouter",
                        latency_ms=round(elapsed, 1),
                        output=f"의도: {decision.intent}\n신뢰도: {decision.confidence * 100:.1f}%",
                    ),
                    ProfessorChatTraceStep(
                        name="LocalPersonaResponder",
                        status="COMPLETED",
                        output=reply,
                    ),
                ],
            ),
            engine=self.name,
            caution="Gemini가 비활성화되어 로컬 교수 대화로 응답했습니다.",
        )


class GeminiProfessorChatEngine:
    name = "Gemini 3-Stage 교수 대화"

    def __init__(self, api_key: str, model: str, fast_model: str = "gemini-3.5-flash-lite") -> None:
        from google import genai

        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.fast_model = fast_model

    @staticmethod
    def _usage(response: object) -> ProfessorChatTokenUsage:
        usage = getattr(response, "usage_metadata", None)
        if usage is None:
            return ProfessorChatTokenUsage()
        return ProfessorChatTokenUsage(
            prompt_tokens=getattr(usage, "prompt_token_count", 0) or 0,
            output_tokens=getattr(usage, "candidates_token_count", 0) or 0,
            total_tokens=getattr(usage, "total_token_count", 0) or 0,
        )

    async def _generate(
        self,
        contents: str,
        schema: type[BaseModel] | None = None,
        *,
        model: str,
        max_output_tokens: int,
        temperature: float = 0.2,
    ) -> tuple[object, float]:
        from google.genai import types

        config = types.GenerateContentConfig(temperature=temperature, max_output_tokens=max_output_tokens)
        if schema is not None:
            config.response_mime_type = "application/json"
            config.response_schema = schema
        started = time.perf_counter()
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=model,
            contents=contents,
            config=config,
        )
        return response, (time.perf_counter() - started) * 1000

    async def chat(
        self,
        request: ProfessorChatRequest,
        lecture_context: str = "",
        context_sources: list[ProfessorChatContextSource] | None = None,
    ) -> ProfessorChatResponse:
        started = time.perf_counter()
        history = _history_text(request)

        router_prompt = f"""당신은 대학 교수 AI의 의도 분류기다. 최근 대화와 새 학생 메시지를 보고 정확히 분류하라.
- CASUAL_CHAT: 인사, 감사, 단순 확인, 일상 대화
- ACADEMIC_QA: 개념 질문, 코드, 논문, 전공 설명, 실질적인 추가 질문
- ASSIGNMENT_EVAL: 과제나 보고서 본문을 제출하고 채점·첨삭을 요청
단순한 '네', '감사합니다'는 반드시 CASUAL_CHAT이다.
설명이나 부연 문장 없이 분류 결과만 간결하게 반환하라.

[최근 대화]
{history}

[새 학생 메시지]
{request.message}"""
        router_response, router_ms = await self._generate(
            router_prompt,
            IntentDecision,
            model=self.fast_model,
            max_output_tokens=96,
            temperature=0.1,
        )
        decision = router_response.parsed or IntentDecision.model_validate_json(router_response.text)
        if decision.intent == "ASSIGNMENT_EVAL" and len(request.message.strip()) < 40:
            decision = IntentDecision(intent="ACADEMIC_QA", confidence=0.7)

        if decision.intent == "ASSIGNMENT_EVAL":
            brain_instruction = (
                "제출물의 핵심 문제와 개선 방향을 구체적으로 설명하되 점수는 매기지 말고, "
                "정식 항목별 평가는 별도의 ‘과제 첨삭 받기’ 메뉴를 사용하도록 4~6문장으로 자연스럽게 안내하라."
            )
        elif decision.intent == "ACADEMIC_QA":
            brain_instruction = (
                "학생 수준에 맞는 정확하고 실질적인 답을 한국어로 충분히 상세하게 작성하라. "
                "핵심 개념, 논리적 근거, 구체적인 예시와 주의점을 포함해 6~10문장으로 설명하라. "
                "모르는 사실은 꾸며내지 마라."
            )
        else:
            brain_instruction = "따뜻한 연구실 대화로 2~4문장으로 답하라. 학술 설명을 억지로 덧붙이지 마라."

        brain_prompt = f"""당신은 {request.persona.department}의 전문적인 대학 교수이자 학술 조교다.
{brain_instruction}
질문에 바로 답하고 불필요한 서론, 반복, 장황한 요약은 쓰지 마라.
질문을 이해하는 데 필요한 설명은 글자 수를 억지로 줄이지 말고 완결된 문장으로 작성하라.
업로드된 강의자료 요약에 관련 내용이 있으면 이를 최우선 근거로 사용하라.
강의자료에 없는 내용을 일반 지식으로 보충할 때는 강의자료의 내용인 것처럼 꾸며내지 마라.

[최근 대화]
{history}

[업로드된 강의자료 요약]
{lecture_context or "(등록된 강의자료 없음)"}

[학생]
{request.message}

[답변 원본]"""
        brain_response, brain_ms = await self._generate(
            brain_prompt,
            model=self.model,
            max_output_tokens=2048,
            temperature=0.2,
        )
        academic_answer = brain_response.text.strip()

        endings = ", ".join(request.persona.sentence_endings) or "프로필의 자연스러운 한국어 어미"
        fillers = ", ".join(request.persona.filler_words) or "필요한 경우에만 자연스러운 연결 표현"
        stylizer_prompt = f"""다음 답변 원본의 사실과 핵심 내용을 그대로 유지하면서 {request.persona.professor_name} 교수의 말투로 자연스럽게 다시 써라.

[교수 프로필]
- 소속: {request.persona.department}
- 과목/전문: {request.persona.subject}
- 성향: {request.persona.summary_bio}
- 톤: {request.persona.tone_description}
- 자주 쓰는 어미: {endings}
- 말버릇: {fillers}

[규칙]
- 어미와 말버릇을 억지로 반복하지 않는다.
- 실제 한국인 교수가 학생에게 직접 말하는 자연스러운 문장으로 쓴다.
- 원문의 문장 수, 상세한 설명, 코드, 수식, 핵심 기술 내용을 줄이거나 누락하지 않는다.
- 원문의 길이와 상세함을 유지하면서 불필요한 수식어와 반복만 제거한다.
- 각 문장은 대화창에서 나누어 표시할 수 있도록 자연스럽고 명확하게 끝맺는다.
- expression은 답변 분위기에 맞춰 normal, strict, smile, thoughtful, surprised 중 하나를 고른다.
- reply만 교수의 실제 발화로 작성하고 설명이나 메타 발언을 넣지 않는다.

[답변 원본]
{academic_answer}"""
        stylizer_response, stylizer_ms = await self._generate(
            stylizer_prompt,
            StyledReply,
            model=self.fast_model,
            max_output_tokens=2048,
            temperature=0.2,
        )
        styled = stylizer_response.parsed or StyledReply.model_validate_json(stylizer_response.text)

        usages = [self._usage(router_response), self._usage(brain_response), self._usage(stylizer_response)]
        tokens = ProfessorChatTokenUsage(
            prompt_tokens=sum(item.prompt_tokens for item in usages),
            output_tokens=sum(item.output_tokens for item in usages),
            total_tokens=sum(item.total_tokens for item in usages),
        )
        log_caution = ""
        try:
            await asyncio.to_thread(
                append_professor_chat_record,
                professor_id=request.professor_id,
                professor_name=request.persona.professor_name,
                department=request.persona.department,
                student_message=request.message,
                intent=decision.intent,
                confidence=decision.confidence,
                academic_model=self.model,
                stylizer_model=self.fast_model,
                academic_answer=academic_answer,
                styled_reply=styled.reply.strip(),
                expression=styled.expression,
                context_sources=context_sources or [],
            )
        except Exception:
            logger.exception("교수 대화 원본/말투 변환 결과 기록에 실패했습니다.")
            log_caution = "답변은 생성됐지만 서버 로그 파일 기록에 실패했습니다."

        total_ms = (time.perf_counter() - started) * 1000
        return ProfessorChatResponse(
            reply=styled.reply.strip(),
            intent=decision.intent,
            confidence=max(0, min(1, decision.confidence)),
            expression=styled.expression,
            tokens=tokens,
            execution_trace=ProfessorChatExecutionTrace(
                pipeline_name=_pipeline_name(decision.intent),
                intent=f"{decision.intent} (신뢰도: {decision.confidence * 100:.1f}%)",
                total_latency_ms=round(total_ms, 1),
                steps=[
                    ProfessorChatTraceStep(
                        name="IntentRouter",
                        model=self.fast_model,
                        latency_ms=round(router_ms, 1),
                        tokens=usages[0].total_tokens,
                        output=f"의도: {decision.intent}\n신뢰도: {decision.confidence * 100:.1f}%",
                    ),
                    ProfessorChatTraceStep(
                        name="AcademicBrainAgent",
                        model=self.model,
                        latency_ms=round(brain_ms, 1),
                        tokens=usages[1].total_tokens,
                        output=academic_answer,
                    ),
                    ProfessorChatTraceStep(
                        name="PersonaStylizerAgent",
                        model=self.fast_model,
                        latency_ms=round(stylizer_ms, 1),
                        tokens=usages[2].total_tokens,
                        output=f"표정: {styled.expression}\n\n{styled.reply.strip()}",
                    ),
                ],
            ),
            context_sources=context_sources or [],
            engine=self.name,
            caution=log_caution,
        )


async def chat_with_fallback(
    request: ProfessorChatRequest,
    lecture_context: str = "",
    context_sources: list[ProfessorChatContextSource] | None = None,
) -> ProfessorChatResponse:
    api_key = os.getenv("CHAT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    model = os.getenv("CHAT_GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-3.6-flash"
    fast_model = os.getenv("CHAT_GEMINI_FAST_MODEL") or "gemini-3.5-flash-lite"
    if api_key:
        try:
            return await GeminiProfessorChatEngine(api_key, model, fast_model).chat(
                request,
                lecture_context,
                context_sources,
            )
        except Exception as exc:
            response = await LocalProfessorChatEngine().chat(request)
            response.caution = f"Gemini 호출 실패로 로컬 교수 대화로 전환했습니다: {type(exc).__name__}"
            return response
    return await LocalProfessorChatEngine().chat(request)
