"""
prompt_synthesizer.py
추출된 교수 페르소나 프로필(ProfessorPersonaProfile)을 기반으로
기능명세서 2.8절의 JSON 구조화 출력 계약을 준수하는 '과제 첨삭 맞춤형 시스템 프롬프트'를 자동 합성합니다.
"""

from __future__ import annotations

import json
from .schemas import ProfessorPersonaProfile, SituationExemplar


class PromptSynthesizer:
    """교수 페르소나 프로필을 실행 가능한 고밀도 LLM 시스템 프롬프트로 합성하는 엔진"""

    @staticmethod
    def synthesize_system_prompt(profile: ProfessorPersonaProfile) -> str:
        """
        교수 프로필로부터 실제 과제 첨삭 엔진에 주입할 System Prompt를 합성한다.
        기능명세 2.8절의 JSON 스키마 및 보안 규칙을 포함합니다.
        """
        dna = profile.dna

        # 어미 및 간투사 리스트 포맷팅
        endings_str = ", ".join([f"'{e}'" for e in dna.sentence_endings]) if dna.sentence_endings else "'~인 겁니다', '~하십시오'"
        fillers_str = ", ".join([f"'{f}'" for f in dna.filler_words]) if dna.filler_words else "'자,', '주목하세요'"
        forbidden_str = ", ".join([f"'{b}'" for b in dna.forbidden_phrases])

        # 퓨샷 예시 블록 구성
        exemplars_block = ""
        if profile.exemplars:
            exemplars_list = []
            for ex in profile.exemplars:
                exemplars_list.append(
                    f"- [{ex.situation_type} 상황] ({ex.context_description})\n"
                    f"  말투 예시: \"{ex.exemplar_speech}\""
                )
            exemplars_block = "\n".join(exemplars_list)
        else:
            exemplars_block = "(No specific few-shots provided. Strictly follow the linguistic rules above.)"

        prompt = f"""\
You are {profile.professor_name}, a professor in the {profile.department} teaching '{profile.subject}'.
Your task is to review student assignment submissions against strict grading rubrics and lecture materials, delivering precise academic feedback in your authentic, unmistakable teaching voice.

================================================================================
1. PROFESSOR PERSONA & LINGUISTIC DNA (말투 및 페르소나 규칙)
================================================================================
- Core Demeanor: {profile.summary_bio}
- Tone & Voice: {dna.tone_description}
- Sentence Rhythm: {dna.sentence_structure}
- MANDATORY Sentence Endings: You MUST naturally use these endings in feedback explanations: {endings_str}
- Characteristic Filler Words / Habits: Naturally incorporate phrases such as: {fillers_str}
- Criticism & Error Correction Style: {dna.criticism_style}
- Praise & Acknowledgment Style: {dna.praise_style}

[STRICT NEGATIVE RULES - 기계적 표현 절대 금지]
Do NOT use robotic, generic AI assistant phrases such as: {forbidden_str}.
Sound like a real, passionate human professor speaking directly to their student.

================================================================================
2. AUTHENTIC SPEECH EXAMPLES (상황별 실제 발화 예시)
================================================================================
{exemplars_block}

================================================================================
3. STRICT OUTPUT CONTRACT (기능명세 2.8절 JSON 계약)
================================================================================
You must evaluate the student's submission against each rubric criterion and output ONLY a valid JSON object matching this exact schema:

{{
  "items": [
    {{
      "criterionId": "<rubric criterion id string>",
      "category": "COURSE_SPECIFIC",
      "verdict": "<MET | PARTIAL | NOT_MET | UNDETERMINED>",
      "submissionQuote": "<EXACT substring from student submission being critiqued>",
      "reason": "<evaluation reasoning written 100% in the professor's authentic voice>",
      "evidenceChunkIds": ["<id of lecture chunk supporting this judgment>"],
      "action": "<1 concrete, actionable revision step written in the professor's voice>",
      "scoreMin": <int, minimum expected score>,
      "scoreMax": <int, maximum expected score>,
      "confidence": "<HIGH | MEDIUM | LOW>",
      "expression": "<DEFAULT | SMILE | QUESTION | SERIOUS | WARNING>"
    }}
  ],
  "generalAdvice": [
    {{
      "submissionQuote": "<optional quote>",
      "reason": "<general academic writing or structural feedback in professor voice>",
      "action": "<concrete action>",
      "expression": "<QUESTION | SERIOUS>"
    }}
  ]
}}

[CRITICAL EVALUATION & SECURITY RULES]
1. Exact Quote Rule: `submissionQuote` MUST be an exact verbatim substring from the student's submission. Never fabricate quotes.
2. Evidence Grounding: For `COURSE_SPECIFIC` items, you MUST link at least 1 valid `evidenceChunkId` from the provided lecture context.
3. Expression Mapping:
   - verdict MET -> expression "SMILE"
   - verdict PARTIAL -> expression "QUESTION" or "SERIOUS"
   - verdict NOT_MET -> expression "WARNING"
   - verdict UNDETERMINED -> expression "QUESTION"
4. Output Purity: Return ONLY pure, parseable JSON. Do NOT include any markdown code blocks, conversational intro, or outro.
"""
        return prompt

    @staticmethod
    def format_assignment_prompt(
        submission_text: str,
        rubric_criteria: list[dict],
        lecture_evidence_chunks: list[dict],
    ) -> str:
        """과제 본문, 루브릭, 강의 근거 자료를 구조화된 유저 프롬프트로 조립한다."""
        rubrics_str = json.dumps(rubric_criteria, ensure_ascii=False, indent=2)
        evidence_str = json.dumps(lecture_evidence_chunks, ensure_ascii=False, indent=2)

        return f"""\
[GRADING RUBRIC CRITERIA]
{rubrics_str}

[LECTURE KNOWLEDGE EVIDENCE CHUNKS]
{evidence_str}

=== SOURCE_START (STUDENT SUBMISSION) ===
{submission_text}
=== SOURCE_END (STUDENT SUBMISSION) ===

Evaluate this student submission following the system rules and persona. Output the final JSON contract.
"""
