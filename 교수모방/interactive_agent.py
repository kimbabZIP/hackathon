"""
interactive_agent.py
일상 대화(Chat)와 과제 첨삭(Assignment Review)을 지능적으로 자동 분기하는
교수 AI 트윈 인터랙티브 에이전트.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

# .env 로드
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .schemas import ProfessorPersonaProfile
from evaluation_engine import (
    EvaluationPipeline,
    SubmissionVersion,
    VersionComparisonReport,
)

logger = logging.getLogger(__name__)


# ── 1. 의도 분류기(Intent Classifier) 프롬프트 ──────────────────────────────

_INTENT_ROUTER_PROMPT = """\
You are an intent classification engine for a university professor AI assistant.
Analyze the student's message IN THE CONTEXT of the recent conversation history.
Classify the student's message into exactly one of three categories:

1. "CASUAL_CHAT":
   - Simple acknowledgments, understanding, agreements, or closures (e.g., "넵", "네, 알겠습니다", "감사합니다", "이해했어요", "오케이", "수고하셨습니다").
   - Greetings, daily life talks, asking for food, campus jokes, casual remarks.
   - Examples: "넵", "네 알겠습니다", "교수님 밥 사주세요", "안녕하세요", "오늘 날씨 춥네요".

2. "ACADEMIC_QA":
   - Substantive questions about computer science concepts, algorithm explanations, programming code, logic debugging.
   - Follow-up requests that ACTUALLY ASK for more information or changes (e.g., "다시 설명해주세요", "예시 보여주세요", "왜 그래요?", "C언어로 바꿔주세요", "더 쉽게 알려주세요").
   - (NOTE: Simple acknowledgments like "넵", "네" without a question MUST BE CASUAL_CHAT).

3. "ASSIGNMENT_EVAL":
   - Explicitly submitting a structured homework draft / code for grading and rubric evaluation.
   - Examples: "교수님 과제 제출합니다: [본문]", "레포트 첨삭 부탁드립니다: [본문]".

[Recent Conversation History]
{history}

[New Student Message]
\"\"\"{message}\"\"\"

Output ONLY a JSON object:
{{
  "intent": "ACADEMIC_QA" | "CASUAL_CHAT" | "ASSIGNMENT_EVAL",
  "confidence": float,
  "assignment_text": "extracted assignment body text if ASSIGNMENT_EVAL, otherwise null"
}}
"""


class InteractiveProfessorAgent:
    """일상 대화와 과제 평가를 스스로 판단하여 처리하는 교수 AI 트윈 에이전트"""

    def __init__(
        self,
        profile: ProfessorPersonaProfile,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.5-flash-lite",
    ) -> None:
        self.profile = profile
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        self.model_name = os.environ.get("MAP_MODEL") or model_name
        self.eval_pipeline = EvaluationPipeline(api_key=self.api_key, model_name=self.model_name)
        
        # 대화 히스토리
        self.history: List[Dict[str, str]] = []

    # ── public ──────────────────────────────────────────────────────────────

    async def interact_async(
        self,
        student_message: str,
        assignment_context: Optional[AssignmentContext] = None,
        previous_submission_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        학생의 메시지를 실시간 텔레메트리 트레이스(Execution Trace)와 함께 다중 파이프라인으로 처리
        """
        t0 = time.perf_counter()
        logger.info("학생 메시지 수신: '%s...'", student_message[:50])

        # 1. 의도 분류 (Router)
        t_router_start = time.perf_counter()
        intent_data = await self._classify_intent(student_message)
        t_router = (time.perf_counter() - t_router_start) * 1000
        intent = intent_data.get("intent", "ACADEMIC_QA")
        confidence = intent_data.get("confidence", 0.95)

        if intent in ["ACADEMIC_QA", "CASUAL_CHAT"]:
            pipe_display_name = "⚡ 【학술 Q&A 2-Stage Multi-Agent 엔진】" if intent == "ACADEMIC_QA" else "💬 【일상/멘토링 대화 파이프라인】"
            logger.info("▶ 의도: [%s] 모드로 파이프라인 가동 중...", intent)
            reply_text, suggested_qs, token_info, trace_steps = await self._generate_chat_reply(
                user_message=student_message,
                assignment_context=assignment_context,
            )
            
            # 대화 기록 갱신: 코드가 포함된 긴 답변은 잘린 코드가 아닌 완전한 요약문으로 저장 (LLM 착각 방지)
            clean_summary = re.sub(r'```[\s\S]*?```', '[코드 제공 완료]', reply_text).strip()
            summary_line = clean_summary.split('\n')[0][:100]
            
            self.history.append({"role": "student", "content": student_message})
            self.history.append({"role": "professor", "content": summary_line})
            if len(self.history) > 6:
                self.history = self.history[-6:]

            total_ms = (time.perf_counter() - t0) * 1000
            
            trace = {
                "pipeline_name": pipe_display_name,
                "intent": f"{intent} (신뢰도: {confidence * 100:.1f}%)",
                "total_latency_ms": round(total_ms, 1),
                "steps": [
                    {"name": "IntentRouter", "latency_ms": round(t_router, 1)},
                    *trace_steps
                ]
            }

            return {
                "type": "CHAT",
                "execution_trace": trace,
                "professor_name": self.profile.professor_name,
                "reply": reply_text,
                "suggested_questions": suggested_qs,
                "expression": "DEFAULT",
                "tokens": token_info,
            }
        else:
            logger.info("▶ 의도: [ASSIGNMENT_EVAL] 모드로 정규화 비교 평가 파이프라인 가동 중...")
            t_eval_start = time.perf_counter()
            assignment_text = intent_data.get("assignment_text") or student_message

            # 대화 기록에 첨삭 요청 기록
            self.history.append({"role": "student", "content": f"[과제 제출] {assignment_text[:80]}"})

            # 주입된 과제 컨텍스트 사용
            if assignment_context and assignment_context.rubric_criteria:
                assign_id = assignment_context.assignment_id
                chunks = assignment_context.lecture_chunks
                rubrics = assignment_context.rubric_criteria
            else:
                assign_id = "general_assign"
                chunks = [
                    {
                        "chunkId": "chunk_general_accuracy",
                        "title": "전공 개념 및 사실 관계의 정확성",
                        "content": "과제 작성 시 전공 용어, 분류 및 핵심 개념의 사실 관계가 정확해야 한다.",
                    },
                    {
                        "chunkId": "chunk_general_completeness",
                        "title": "조사 내용의 충실도",
                        "content": "단순 나열에 그치지 않고 정의와 동작 원리를 충실히 기술해야 한다.",
                    }
                ]
                rubrics = [
                    {
                        "criterionId": "crit_factual_accuracy",
                        "name": "전공 개념 및 팩트 정확성",
                        "description": "핵심 개념과 사실 관계가 오류 없이 정확하게 기술되었는가",
                        "maxScore": 50,
                    },
                    {
                        "criterionId": "crit_depth_completeness",
                        "name": "내용의 충실도 및 완성도",
                        "description": "조사 범위와 설명이 충분히 충실하게 작성되었는가",
                        "maxScore": 50,
                    },
                ]

            base_text = previous_submission_text or "이전 제출 내용 없음 (신규 제출)"
            v1 = SubmissionVersion(assignment_id=assign_id, version_no=1, content=base_text)
            v2 = SubmissionVersion(assignment_id=assign_id, version_no=2, content=assignment_text)

            report = await self.eval_pipeline.evaluate_version_chain_async(
                assignment_id=assign_id,
                base_version=v1,
                target_version=v2,
                raw_lecture_chunks=chunks,
                rubric_criteria=rubrics,
                previous_feedback_items=[],
                professor_persona_prompt=f"You are professor {self.profile.professor_name}. Tone: {self.profile.dna.tone_description}. Endings: {', '.join(self.profile.dna.sentence_endings)}",
            )

            t_eval = (time.perf_counter() - t_eval_start) * 1000
            total_ms = (time.perf_counter() - t0) * 1000

            trace = {
                "pipeline_name": "RAG-Diff Knowledge Evaluation Engine",
                "intent": f"{intent} (신뢰도: {confidence * 100:.1f}%)",
                "total_latency_ms": round(total_ms, 1),
                "steps": [
                    {"name": "IntentRouter", "latency_ms": round(t_router, 1)},
                    {"name": "MyersDiff & SentenceNormalizer", "status": "COMPLETED"},
                    {"name": "LectureChunkComparator", "chunks_compared": len(chunks), "latency_ms": round(t_eval, 1)},
                    {"name": "RubricEvaluator", "criteria_evaluated": len(rubrics)},
                ]
            }

            summary_short = report.professor_feedback_summary
            self.history.append({"role": "professor", "content": f"[과제 총평] {summary_short[:80]}"})

            eval_suggested_qs = [
                "지적해주신 부족한 항목을 보완하려면 어떤 내용을 추가해야 하나요?",
                "감점된 기준에 대한 모범 작성 예시를 보여주실 수 있나요?"
            ]

            return {
                "type": "ASSIGNMENT_EVALUATION",
                "execution_trace": trace,
                "professor_name": self.profile.professor_name,
                "report": report.model_dump(),
                "summary": report.professor_feedback_summary,
                "suggested_questions": eval_suggested_qs,
                "expression": report.criterion_results[0].expression if report.criterion_results else "SERIOUS",
                "tokens": {"total_tokens": 850},
            }

    # ── private ─────────────────────────────────────────────────────────────

    async def _classify_intent(self, message: str) -> Dict[str, Any]:
        """학생 발화의 의도를 이전 대화 맥락을 포함하여 3가지로 정밀 분류"""
        history_text = "\n".join([
            f"{'학생' if h['role'] == 'student' else '교수'}: {h['content']}"
            for h in self.history[-4:]
        ]) or "(대화 시작)"

        prompt = _INTENT_ROUTER_PROMPT.format(history=history_text, message=message)
        raw_json, _ = await self._call_gemini(prompt, is_json=True)
        try:
            res = json.loads(self._clean_json(raw_json))
            if res.get("intent") == "ASSIGNMENT_EVAL":
                body = res.get("assignment_text") or message
                if len(body.strip()) < 40 and not any(tag in body for tag in ["\n", "1.", "2.", "def ", "class ", "git "]):
                    res["intent"] = "ACADEMIC_QA"
                    res["assignment_text"] = None
            return res
        except Exception:
            if len(message) > 100 and any(kw in message for kw in ["과제", "코드", "커밋", "브랜치", "README"]):
                return {"intent": "ASSIGNMENT_EVAL", "assignment_text": message}
            return {"intent": "ACADEMIC_QA", "assignment_text": None}

    async def _generate_chat_reply(
        self,
        user_message: str,
        assignment_context: Optional[AssignmentContext] = None,
    ) -> Tuple[str, Dict[str, int], List[Dict[str, Any]]]:
        """
        [2단계 분리 파이프라인 (2-Stage Dual Agent)]
        Step 1: 학술/대화 두뇌 (Brain) - 질문 맥락 파악 및 실질적 해답/위트 있는 답변 생성
        Step 2: 페르소나 스타일러 (Persona Stylizer) - 교수 고유 어투로 자연스럽게 리라이팅
        """
        dna = self.profile.dna
        endings = ", ".join([f"'{e}'" for e in dna.sentence_endings]) if dna.sentence_endings else "'~구먼', '~단 말일세', '~게나', '~인가?'"
        fillers = ", ".join([f"'{f}'" for f in dna.filler_words]) if dna.filler_words else "'허허,', '자,', '음,'"

        # 이전 대화 히스토리 포맷팅
        history_text = "\n".join([
            f"{'학생' if h['role'] == 'student' else '교수'}: {h['content']}"
            for h in self.history
        ])
        if not history_text:
            history_text = "(대화 시작)"

        # ── 1단계: 순수 학술/대화 두뇌 ─────────────────────────────────────
        t1_start = time.perf_counter()
        brain_system_prompt = """\
You are an expert, highly intelligent Computer Science Professor and Academic Assistant.
Answer the student's message with genuine intelligence and contextual awareness:
1. SIMPLE ACKNOWLEDGMENTS & CLOSURES:
   - If the student says simple confirmations/thanks/closures (e.g., "넵", "네, 알겠습니다", "감사합니다", "이해했어요", "좋습니다"):
     DO NOT output, repeat, or explain any code!
     Simply give a short, warm, encouraging 1-sentence professor response (e.g. "좋아, 직접 컴파일해보고 막히면 언제든 또 물어보게나!").
2. CONTEXTUAL & DEEP LEVEL ADAPTATION:
   - If the student asks for a deeper/advanced explanation (e.g. "저 수석이에요", "전공자 수준으로 다시 설명해주세요"):
     Provide an advanced, rigorous CS explanation.
3. GREETINGS & TOPIC CHANGES:
   - If the student greets (e.g., "안녕하세요", "반갑습니다"), greet them warmly.
4. ACADEMIC & CS QUESTIONS:
   - If the student asks real questions or for code, provide clean code and concise explanations.
5. CASUAL TALK:
   - If the student makes casual jokes ("밥 사주세요"), respond with warm campus mentoring.
"""
        brain_prompt = f"{brain_system_prompt}\n\n[Conversation History]\n{history_text}\n\n[Student Message]\n{user_message}\n\n[Direct Answer]:"
        
        academic_answer, token_info_1 = await self._call_gemini(brain_prompt)
        t1_ms = (time.perf_counter() - t1_start) * 1000

        # ── 2단계: 교수 페르소나 스타일러 + 미연시 스타일 예상 선택지 2개 생성 ──
        t2_start = time.perf_counter()
        stylizer_system_prompt = f"""\
당신은 최고급 자연어 스타일 변환기(Persona Stylizer)이자 비주얼 노벨(미연시) 대화 분기 엔진입니다.
입력으로 주어지는 [답변 원본]의 학술적 사실과 핵심 내용을 100% 온전하게 유지하면서,
컴퓨터공학과 '{self.profile.professor_name}' 교수님의 자연스럽고 매끄러운 어투로 리라이팅하고,
학생이 화면에서 고를 수 있는 **[미연시(비주얼 노벨) 스타일의 매력적인 선택지 2개]**를 생성하십시오.

[교수 페르소나 프로필]
• 이름: {self.profile.professor_name} 교수
• 성향: {self.profile.summary_bio}
• 어조 및 스타일: {self.profile.dna.tone_description}
• 주된 종결어미 스타일: {endings}

[리라이팅 및 미연시 선택지 생성 규칙]
1. 교수 발화 리라이팅:
   - 교수 특유의 말투 톤앤매너로 자연스럽고 매끄러운 한국어 문장으로 작성하십시오.
   - 코드 블록, 수식, 핵심 기술 설명은 누락하거나 변형하지 말고 그대로 유지하십시오.
2. **suggested_questions (미연시 스타일 선택지 2개)**:
   - 비주얼 노벨 게임처럼 **학생의 행동 지문/표정(괄호 지문)**이 들어간 2가지 상반된 매력의 선택지를 만드십시오:
     • **선택지 1 (모범생 / 학구열 / 심화 직진형)**: 
       예) `"(눈을 반짝이며) 교수님! 우선순위 큐(Heap)를 써서 시간 복잡도를 더 줄이는 방법도 알고 싶습니다!"`
     • **선택지 2 (현실 대학생 / 위트 / 다른 관점 의문형)**: 
       예) `"(머리를 긁적이며 조심스럽게) 교수님, 만약 실무나 시험에서 그래프에 음수 가중치가 나오면 어떻게 대처해야 하나요...?"`

반드시 아래 JSON 형식으로만 응답하십시오:
```json
{{
  "reply": "교수님 어투로 작성된 최종 답변 전문 (마크다운 코드블록 포함)",
  "suggested_questions": [
    "(행동 지문) 학생의 모범/학구적 선택지 1",
    "(행동 지문) 학생의 현실적/위트 있는 선택지 2"
  ]
}}
```
"""
        stylizer_prompt = f"{stylizer_system_prompt}\n\n[답변 원본]\n{academic_answer}\n\n[JSON 응답]:"
        
        raw_json, token_info_2 = await self._call_gemini(stylizer_prompt, is_json=True)
        t2_ms = (time.perf_counter() - t2_start) * 1000

        try:
            parsed_data = json.loads(self._clean_json(raw_json))
            final_reply = parsed_data.get("reply", raw_json)
            suggested_qs = parsed_data.get("suggested_questions", [])
            if not isinstance(suggested_qs, list) or len(suggested_qs) < 2:
                suggested_qs = [
                    "이 내용의 구체적인 코드 예시를 더 보여주실 수 있나요?",
                    "실무나 시험에서 주의해야 할 핵심 포인트는 무엇인가요?"
                ]
            else:
                suggested_qs = suggested_qs[:2]
        except Exception:
            final_reply = raw_json
            suggested_qs = [
                "이 내용의 구체적인 코드 예시를 더 보여주실 수 있나요?",
                "실무나 시험에서 주의해야 할 핵심 포인트는 무엇인가요?"
            ]

        total_tokens = {
            "prompt_tokens": token_info_1.get("prompt_tokens", 0) + token_info_2.get("prompt_tokens", 0),
            "output_tokens": token_info_1.get("output_tokens", 0) + token_info_2.get("output_tokens", 0),
            "total_tokens": token_info_1.get("total_tokens", 0) + token_info_2.get("total_tokens", 0),
        }

        trace_steps = [
            {"name": "AcademicBrainAgent", "latency_ms": round(t1_ms, 1), "tokens": token_info_1.get("total_tokens", 0)},
            {"name": "PersonaStylizerAgent", "latency_ms": round(t2_ms, 1), "tokens": token_info_2.get("total_tokens", 0)},
        ]

        return final_reply, suggested_qs, total_tokens, trace_steps

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    async def _call_gemini(self, prompt: str, is_json: bool = False) -> Tuple[str, Dict[str, int]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048},
        }
        if is_json:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        async with httpx.AsyncClient(timeout=60.0) as client:
            for attempt in range(5):
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    usage = data.get("usageMetadata", {})
                    token_info = {
                        "prompt_tokens": usage.get("promptTokenCount", 0),
                        "output_tokens": usage.get("candidatesTokenCount", 0),
                        "total_tokens": usage.get("totalTokenCount", 0),
                    }
                    return text, token_info
                elif resp.status_code == 429:
                    logger.warning("[429 Rate Limit] 25초 대기 후 자동 재시도... (%d/5)", attempt + 1)
                    await asyncio.sleep(25.0)
                else:
                    raise RuntimeError(f"Gemini API Error ({resp.status_code}): {resp.text}")
            raise RuntimeError("429 Retry limit exceeded")

    @staticmethod
    def _clean_json(text: str) -> str:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
        return cleaned
