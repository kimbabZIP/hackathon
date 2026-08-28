from __future__ import annotations

import asyncio
import json
import wave
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

from assignment_grader import auth as auth_module
from assignment_grader import lecture_audio as lecture_audio_module
from audio_pipeline import extractor as audio_extractor_module
from google.genai import types as genai_types
from assignment_grader.auth import AuthStore
from assignment_grader.database import AppDatabase
from assignment_grader.documents import DocumentError, extract_text
from assignment_grader.engine import LocalFeedbackEngine
from assignment_grader.examples import EXAMPLES
from assignment_grader.main import app
from assignment_grader.material_store import LectureMaterialStore
from assignment_grader.professor_chat import (
    GeminiProfessorChatEngine,
    IntentDecision,
    LocalProfessorChatEngine,
    StyledReply,
)
from assignment_grader.professor_store import ProfessorStore
from assignment_grader.routers import chat as chat_router
from assignment_grader.routers import materials as materials_router
from assignment_grader.routers import professors as professors_router
from assignment_grader.schemas import (
    GradeRequest,
    ProfessorChatContextSource,
    ProfessorChatPersona,
    ProfessorChatRequest,
)


def _request(index: int) -> GradeRequest:
    item = EXAMPLES[index]
    return GradeRequest(lecture_summary=item.lecture_summary, assignment_prompt=item.assignment_prompt, student_submission=item.student_submission)


def test_three_examples_exist() -> None:
    assert [item.id for item in EXAMPLES] == ["strong", "misconception", "incomplete"]


def test_local_engine_detects_misconceptions() -> None:
    report = asyncio.run(LocalFeedbackEngine().grade(_request(1)))
    assert report.total_score <= 65
    assert len(report.misconceptions) >= 2
    assert sum(x.max_score for x in report.criteria) == 100


def test_strong_example_scores_above_incomplete() -> None:
    strong = asyncio.run(LocalFeedbackEngine().grade(_request(0)))
    incomplete = asyncio.run(LocalFeedbackEngine().grade(_request(2)))
    assert strong.total_score >= 85
    assert strong.total_score > incomplete.total_score


def test_text_extraction_and_rejection() -> None:
    assert "강의" in extract_text("summary.txt", "강의 요약 내용입니다.".encode())
    try:
        extract_text("bad.exe", b"not allowed")
    except DocumentError as exc:
        assert "PDF" in str(exc)
    else:
        raise AssertionError("unsupported extension was accepted")


def test_unified_api_index_and_health() -> None:
    client = TestClient(app)
    index = client.get("/api")
    health = client.get("/api/health")

    assert index.status_code == 200
    assert index.json()["name"] == "Scholarly Affection API"
    assert health.status_code == 200
    assert set(health.json()["services"]) == {
        "auth",
        "professors",
        "assignments",
        "chat",
        "materials",
        "audio",
    }


def test_register_login_session_and_professor_database(monkeypatch, tmp_path) -> None:
    app_database = AppDatabase(tmp_path / "scholarly.db")
    auth_store = AuthStore(app_database)
    professor_store = ProfessorStore(app_database)
    monkeypatch.setattr(auth_module, "auth_store", auth_store)
    monkeypatch.setattr(professors_router, "professor_store", professor_store)

    client = TestClient(app)
    registered = client.post(
        "/api/auth/register",
        json={
            "login_id": "student.one",
            "password": "safe-password-1234",
            "display_name": "테스트 학생",
        },
    )
    assert registered.status_code == 201
    assert registered.json()["user"]["login_id"] == "student.one"
    assert "HttpOnly" in registered.headers["set-cookie"]

    with app_database.connect() as connection:
        stored = connection.execute(
            "SELECT password_hash FROM users WHERE login_id_normalized = ?",
            ("student.one",),
        ).fetchone()
    assert stored["password_hash"].startswith("$argon2id$")
    assert "safe-password-1234" not in stored["password_hash"]

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["display_name"] == "테스트 학생"

    saved = client.post(
        "/api/professors",
        json={
            "template_id": "yoon",
            "name": "윤하린 교수",
            "age": 38,
            "department": "컴퓨터공학과",
            "specialty": "소프트웨어 논증",
            "personality_type": "논리 파괴형",
            "representative_quote": "근거가 어디 있습니까?",
            "difficulty": 5,
            "make_active": True,
        },
    )
    assert saved.status_code == 200
    assert saved.json()["owner_user_id"] == registered.json()["user"]["id"]
    assert saved.json()["is_active"] is True

    listed = client.get("/api/professors")
    assert listed.status_code == 200
    assert [item["template_id"] for item in listed.json()] == ["yoon"]

    logged_out = client.post("/api/auth/logout")
    assert logged_out.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_mock_audio_analysis_uses_fixed_transcript(monkeypatch, tmp_path: Path) -> None:
    transcript_path = tmp_path / "transcript.txt"
    transcript_path.write_text("고정 전문 첫 문장입니다.\n고정 전문 두 번째 문장입니다.", encoding="utf-8")
    monkeypatch.setattr(lecture_audio_module, "TRANSCRIPT_PATH", transcript_path)

    client = TestClient(app)
    response = client.post(
        "/api/audio/analyze",
        data={
            "professor_id": "prof-audio",
            "professor_name": "테스트 교수",
            "department": "컴퓨터공학과",
            "subject": "알고리즘",
        },
        files={"file": ("lecture.mp3", b"fake audio bytes", "audio/mpeg")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source_file_name"] == "transcript.txt"
    assert payload["uploaded_audio_name"] == "lecture.mp3"
    assert payload["professor_transcript"]
    assert payload["persona_profile"]["dna"]["sentence_endings"]


def test_audio_analysis_falls_back_to_real_pipeline_when_transcript_is_missing(
    monkeypatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {}

    class FakeAudioProfessorExtractor:
        def __init__(self, model_name: str):
            calls["model_name"] = model_name

        async def extract_from_audio_async(
            self,
            audio_file_path: str,
            *,
            professor_context: dict[str, str] | None = None,
            progress_id: str = "unknown",
        ):
            calls["audio_bytes"] = Path(audio_file_path).read_bytes()
            calls["professor_context"] = professor_context
            calls["progress_id"] = progress_id
            return lecture_audio_module.AudioExtractionResult(
                professor_transcript="자, 오늘은 그래프 탐색을 설명하겠습니다.",
                full_diarized_transcript="[Speaker 1 (Professor)]: 자, 오늘은 그래프 탐색을 설명하겠습니다.",
                summary="그래프 탐색의 핵심 개념을 설명한 강의입니다.",
                persona_profile={
                    "summary_bio": "핵심부터 설명하는 교수",
                    "dna": {
                        "sentence_endings": ["~하겠습니다"],
                        "filler_words": ["자"],
                        "tone_description": "차분한 설명형 어조",
                    },
                },
            )

        def close(self) -> None:
            calls["closed"] = True

    def fake_clip_audio(source_path: Path, output_path: Path, *, max_seconds: int = 300) -> float:
        calls["original_audio_bytes"] = source_path.read_bytes()
        calls["clip_max_seconds"] = max_seconds
        output_path.write_bytes(b"first five minutes only")
        return 300.0

    monkeypatch.setattr(lecture_audio_module, "TRANSCRIPT_PATH", tmp_path / "missing-transcript.txt")
    monkeypatch.setattr(lecture_audio_module, "AudioProfessorExtractor", FakeAudioProfessorExtractor)
    monkeypatch.setattr(lecture_audio_module, "_clip_audio_for_stt", fake_clip_audio)
    monkeypatch.setenv("AUDIO_GEMINI_MODEL", "gemini-audio-test")

    client = TestClient(app)
    response = client.post(
        "/api/audio/analyze",
        data={
            "professor_id": "prof-audio",
            "professor_name": "테스트 교수",
            "department": "컴퓨터공학과",
            "subject": "그래프 알고리즘",
        },
        files={"file": ("real-lecture.wav", b"real audio bytes", "audio/wav")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert calls["original_audio_bytes"] == b"real audio bytes"
    assert calls["audio_bytes"] == b"first five minutes only"
    assert calls["clip_max_seconds"] == 300
    assert calls["model_name"] == "gemini-audio-test"
    assert len(str(calls["progress_id"])) == 8
    assert calls["professor_context"] == {
        "professor_name": "테스트 교수",
        "department": "컴퓨터공학과",
        "subject": "그래프 알고리즘",
    }
    assert calls["closed"] is True
    assert payload["source_file_name"] == "real-lecture.wav"
    assert payload["summary"] == "그래프 탐색의 핵심 개념을 설명한 강의입니다."
    assert payload["persona_profile"]["dna"]["sentence_endings"] == ["~하겠습니다"]
    assert payload["engine"] == "Gemini AudioProfessorExtractor · gemini-audio-test · first 300s"


def test_audio_clip_discards_everything_after_limit(tmp_path: Path) -> None:
    source_path = tmp_path / "two-seconds.wav"
    output_path = tmp_path / "first-second.wav"
    with wave.open(str(source_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(8_000)
        wav_file.writeframes(b"\x00\x00" * 16_000)

    duration = lecture_audio_module._clip_audio_for_stt(
        source_path,
        output_path,
        max_seconds=1,
    )

    with wave.open(str(output_path), "rb") as clipped_file:
        clipped_duration = clipped_file.getnframes() / clipped_file.getframerate()
        assert clipped_file.getnchannels() == 1
        assert clipped_file.getframerate() == 16_000
    assert 0.99 <= duration <= 1.0
    assert 0.99 <= clipped_duration <= 1.0


def test_audio_extractor_separates_plain_transcript_from_structured_analysis(tmp_path: Path) -> None:
    audio_path = tmp_path / "lecture.wav"
    audio_path.write_bytes(b"fake wav")
    calls: list[dict[str, object]] = []

    class FakeFiles:
        def upload(self, *, file: str):
            return SimpleNamespace(
                name="files/test-audio",
                mime_type="audio/wav",
                state=genai_types.FileState.ACTIVE,
                error=None,
            )

        def delete(self, *, name: str):
            calls.append({"deleted": name})

    class FakeModels:
        def generate_content(self, *, model: str, contents, config):
            calls.append({"model": model, "contents": contents, "config": config})
            if len([call for call in calls if "config" in call]) == 1:
                return SimpleNamespace(
                    text='교수는 "정렬"이라고 했습니다.\n다음 개념을 설명하겠습니다.',
                    parsed=None,
                    candidates=[SimpleNamespace(finish_reason=genai_types.FinishReason.STOP)],
                    usage_metadata=SimpleNamespace(candidates_token_count=25),
                )
            return SimpleNamespace(
                text='{"summary":"정렬 강의"}',
                parsed=audio_extractor_module.TranscriptAnalysisResult(
                    summary="정렬 개념을 설명한 강의입니다.",
                    persona_profile={
                        "summary_bio": "예시 중심 교수",
                        "dna": {"sentence_endings": ["~하겠습니다"]},
                    },
                ),
                candidates=[SimpleNamespace(finish_reason=genai_types.FinishReason.STOP)],
                usage_metadata=SimpleNamespace(candidates_token_count=40),
            )

    extractor = audio_extractor_module.AudioProfessorExtractor.__new__(
        audio_extractor_module.AudioProfessorExtractor
    )
    extractor.client = SimpleNamespace(files=FakeFiles(), models=FakeModels())
    extractor.model_name = "gemini-audio-test"
    extractor.max_output_tokens = 65_536

    result = asyncio.run(
        extractor.extract_from_audio_async(str(audio_path), progress_id="jsonsafe")
    )

    generation_calls = [call for call in calls if "config" in call]
    assert len(generation_calls) == 2
    assert generation_calls[0]["config"].response_mime_type == "text/plain"
    assert generation_calls[1]["config"].response_schema is audio_extractor_module.TranscriptAnalysisResult
    assert generation_calls[0]["config"].automatic_function_calling.disable is True
    assert result.professor_transcript.startswith('교수는 "정렬"')
    assert result.summary == "정렬 개념을 설명한 강의입니다."
    assert calls[-1] == {"deleted": "files/test-audio"}


def test_web_examples_and_grade() -> None:
    client = TestClient(app)
    assert len(client.get("/api/assignments/examples").json()) == 3
    response = client.post("/api/assignments/grade", json=_request(2).model_dump())
    assert response.status_code == 200
    assert response.json()["total_score"] <= 100

    # 기존 클라이언트가 새 서버로 순차 이전할 수 있도록 legacy 경로도 유지한다.
    assert len(client.get("/api/examples").json()) == 3


def test_ai_required_grade_does_not_return_local_fallback(monkeypatch) -> None:
    monkeypatch.delenv("GRADE_GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.post(
        "/api/assignments/grade?require_ai=true",
        json=_request(0).model_dump(),
    )

    assert response.status_code == 503
    assert "API 키" in response.json()["detail"]


def _chat_request(message: str) -> ProfessorChatRequest:
    return ProfessorChatRequest(
        message=message,
        persona=ProfessorChatPersona(
            professor_name="이태준 교수",
            department="고전문학",
            subject="텍스트 원전 비평",
            summary_bio="엄격하지만 학생의 성장을 아끼는 지도 교수",
            tone_description="차분하고 논리적인 문어체",
            sentence_endings=["~하게", "~일세"],
            filler_words=["자,", "흐음"],
        ),
    )


def test_local_professor_chat_routes_academic_question() -> None:
    response = asyncio.run(LocalProfessorChatEngine().chat(_chat_request("은유와 상징의 차이를 설명해 주세요.")))
    assert response.intent == "ACADEMIC_QA"
    assert response.reply
    assert response.expression == "thoughtful"
    assert response.execution_trace.steps[0].name == "LocalIntentRouter"
    assert "ACADEMIC_QA" in (response.execution_trace.steps[0].output or "")
    assert response.execution_trace.steps[1].output == response.reply


def test_gemini_professor_chat_exposes_each_agent_output(monkeypatch, tmp_path) -> None:
    engine = GeminiProfessorChatEngine("test-key", "test-model", "test-fast-model")
    calls = []
    log_path = tmp_path / "professor_chat_responses.jsonl"
    monkeypatch.setenv("PROFESSOR_CHAT_LOG_PATH", str(log_path))

    async def fake_generate(contents, schema=None, **options):
        calls.append((contents, schema, options))
        if schema is IntentDecision:
            return SimpleNamespace(
                parsed=IntentDecision(intent="ACADEMIC_QA", confidence=0.91),
                text="",
                usage_metadata=None,
            ), 12.5
        if schema is StyledReply:
            return SimpleNamespace(
                parsed=StyledReply(reply="교수 말투가 적용된 최종 답변일세.", expression="thoughtful"),
                text="",
                usage_metadata=None,
            ), 18.0
        return SimpleNamespace(
            parsed=None,
            text="말투 적용 전의 학술 답변 원본입니다.",
            usage_metadata=None,
        ), 35.0

    monkeypatch.setattr(engine, "_generate", fake_generate)
    source = ProfessorChatContextSource(
        material_id="mat-test",
        title="은유와 상징 강의",
        file_name="lecture.pdf",
    )
    response = asyncio.run(
        engine.chat(
            _chat_request("은유와 상징의 차이를 설명해 주세요."),
            "# 강의 요약\n- 은유는 직접 비교이며 상징은 반복 이미지로 의미를 만든다.",
            [source],
        )
    )
    steps = response.execution_trace.steps

    assert [step.name for step in steps] == ["IntentRouter", "AcademicBrainAgent", "PersonaStylizerAgent"]
    assert [step.model for step in steps] == ["test-fast-model", "test-model", "test-fast-model"]
    assert "ACADEMIC_QA" in (steps[0].output or "")
    assert steps[1].output == "말투 적용 전의 학술 답변 원본입니다."
    assert "교수 말투가 적용된 최종 답변" in (steps[2].output or "")
    assert response.context_sources == [source]
    assert calls[0][2] == {"model": "test-fast-model", "max_output_tokens": 96, "temperature": 0.1}
    assert calls[1][2] == {"model": "test-model", "max_output_tokens": 2048, "temperature": 0.2}
    assert calls[2][2] == {"model": "test-fast-model", "max_output_tokens": 2048, "temperature": 0.2}
    assert "6~10문장" in calls[1][0]
    assert "원문의 길이와 상세함을 유지" in calls[2][0]
    assert "은유는 직접 비교" in calls[1][0]

    records = [json.loads(line) for line in log_path.read_text(encoding="utf-8").splitlines()]
    assert len(records) == 1
    assert records[0]["academic_answer"] == "말투 적용 전의 학술 답변 원본입니다."
    assert records[0]["styled_reply"] == "교수 말투가 적용된 최종 답변일세."
    assert records[0]["academic_model"] == "test-model"
    assert records[0]["stylizer_model"] == "test-fast-model"
    assert records[0]["context_sources"][0]["title"] == "은유와 상징 강의"


def test_material_upload_persists_and_chat_loads_context(monkeypatch, tmp_path) -> None:
    store = LectureMaterialStore(tmp_path / "materials.db")
    summary_calls = 0

    async def fake_summary(_pdf_bytes: bytes):
        nonlocal summary_calls
        summary_calls += 1
        return SimpleNamespace(
            total_pages=4,
            processed_chunks=1,
            final_summary="# 테스트 강의\n- 핵심 개념은 저장된 요약에서 가져옵니다.",
        )

    captured = {}

    async def fake_chat(request, lecture_context="", context_sources=None):
        captured["context"] = lecture_context
        captured["sources"] = context_sources or []
        response = await LocalProfessorChatEngine().chat(request)
        response.context_sources = context_sources or []
        return response

    monkeypatch.setattr(materials_router, "material_store", store)
    monkeypatch.setattr(materials_router, "summarize_pdf", fake_summary)
    monkeypatch.setattr(chat_router, "material_store", store)
    monkeypatch.setattr(chat_router, "chat_with_fallback", fake_chat)

    client = TestClient(app)
    uploaded = client.post(
        "/api/materials/summarize",
        data={"professor_id": "prof-test", "title": "테스트 강의"},
        files={"file": ("lecture.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert uploaded.status_code == 200
    assert uploaded.json()["total_pages"] == 4
    assert uploaded.json()["cache_hit"] is False

    uploaded_again = client.post(
        "/api/materials/summarize",
        data={"professor_id": "prof-test", "title": "이 제목은 다시 저장되지 않음"},
        files={"file": ("lecture.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert uploaded_again.status_code == 200
    assert uploaded_again.json()["cache_hit"] is True
    assert uploaded_again.json()["id"] == uploaded.json()["id"]
    assert uploaded_again.json()["summary"] == uploaded.json()["summary"]
    assert summary_calls == 1

    listed = client.get("/api/materials", params={"professor_id": "prof-test"})
    assert listed.status_code == 200
    assert listed.json()[0]["summary"].startswith("# 테스트 강의")

    payload = _chat_request("강의자료의 핵심 개념을 설명해 주세요.").model_dump()
    payload["professor_id"] = "prof-test"
    chatted = client.post("/api/chat", json=payload)
    assert chatted.status_code == 200
    assert "저장된 요약" in captured["context"]
    assert captured["sources"][0].title == "테스트 강의"
    assert chatted.json()["context_sources"][0]["file_name"] == "lecture.pdf"


def test_professor_chat_endpoint_uses_local_fallback(monkeypatch) -> None:
    monkeypatch.setenv("CHAT_GEMINI_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    client = TestClient(app)
    response = client.post("/api/chat", json=_chat_request("안녕하세요, 교수님.").model_dump())
    assert response.status_code == 200
    assert response.json()["intent"] == "CASUAL_CHAT"
    assert response.json()["engine"] == "로컬 교수 대화 엔진"

    legacy = client.post("/api/professor-chat", json=_chat_request("반갑습니다.").model_dump())
    assert legacy.status_code == 200
