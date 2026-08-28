# Scholarly Affection 통합 FastAPI

`Scholarly Affection`에서 사용하는 Python 기능을 하나의 FastAPI 앱으로 제공합니다. 기존 폴더명은 호환을 위해 유지하지만, 서버는 과제 첨삭과 연구실 교수 대화를 함께 처리합니다.

## 실행

권장 실행 방법:

```powershell
cd "C:\Users\bman4\Desktop\새 폴더\scholarly-affection"
npm run api
```

`npm run api`는 Node 기반 공용 실행기를 사용하며 Windows의 `.venv\Scripts\python.exe`와 Linux/macOS의 `.venv/bin/python`을 자동 선택합니다. 기존 PowerShell 스크립트도 호환용으로 남아 있습니다.

Linux 최초 실행:

```bash
cd /path/to/workspace
python3 -m venv .venv
./.venv/bin/python -m pip install -r assignment_feedback_system/requirements.txt
cd frontend
npm install
npm run api
```

```powershell
cd "C:\Users\bman4\Desktop\새 폴더\assignment_feedback_system"
.\run_assignment_grader.ps1
```

서버 주소는 `http://127.0.0.1:8010`, OpenAPI 문서는 `http://127.0.0.1:8010/docs`입니다.

## API 구조

| 기능 | 경로 |
|---|---|
| API 정보 | `GET /api` |
| 통합 상태 | `GET /api/health` |
| 회원가입 | `POST /api/auth/register` |
| 로그인 | `POST /api/auth/login` |
| 내 로그인 상태 | `GET /api/auth/me` |
| 로그아웃 | `POST /api/auth/logout` |
| 내 교수 프로필 목록·저장 | `GET/POST /api/professors` |
| 교수 프로필 활성 선택 | `POST /api/professors/{professor_id}/select` |
| 첨삭 예제 | `GET /api/assignments/examples` |
| 텍스트 첨삭 | `POST /api/assignments/grade` |
| 파일 첨삭 | `POST /api/assignments/grade-files` |
| 교수별 강의자료 목록 | `GET /api/materials?professor_id=...` |
| PDF 추출·요약·저장 | `POST /api/materials/summarize` |
| 강의 음성 모의 분석 | `POST /api/audio/analyze` |
| 교수 대화 | `POST /api/chat` |

기존 `/api/examples`, `/api/grade`, `/api/grade-files`, `/api/professor-chat` 경로는 이전 클라이언트 호환용으로 유지되며 OpenAPI 문서에는 노출하지 않습니다.

## 회원·교수 데이터베이스

SQLite 파일은 `assignment_feedback_system/data/scholarly_affection.db`에 생성됩니다. `users`, `user_sessions`, `auth_events`, `professors`, `professor_personas`, `user_settings` 외에 대화·첨삭 확장용 테이블을 함께 구성합니다. 기존 강의자료 테이블은 시작 시 회원 소유자 컬럼을 자동 추가하는 방식으로 마이그레이션합니다.

비밀번호 원문은 저장하지 않고 Argon2id 해시만 저장합니다. 로그인 세션은 7일 만료의 난수 토큰을 발급해 토큰 해시만 DB에 기록하고, 브라우저에는 `HttpOnly`, `SameSite=Lax` 쿠키로 전달합니다. 운영 HTTPS 환경에서는 `SESSION_COOKIE_SECURE=true`를 설정합니다. 로그인 실패가 5회 누적되면 해당 계정은 15분 동안 잠깁니다.

교수 프로필, PDF 요약, 대화 참고 자료, 음성에서 추출한 페르소나는 로그인 회원별로 분리됩니다. 로그인 전에 저장된 소유자 없는 강의자료는 호환용 레거시 데이터로 남으며 로그인 회원 데이터에 자동 합쳐지지 않습니다.

`GEMINI_API_KEY`가 있으면 공통 Gemini 키로 사용합니다. 과제 첨삭은 `GRADE_GEMINI_API_KEY`/`GRADE_GEMINI_MODEL`, 교수 대화의 학술 답변 원본은 `CHAT_GEMINI_API_KEY`/`CHAT_GEMINI_MODEL`로 별도 설정할 수도 있습니다. 교수 대화의 IntentRouter와 PersonaStylizerAgent는 `gemini-2.5-flash-lite`가 현재 키에 404를 반환해 공식 후속 모델인 `gemini-3.5-flash-lite`를 기본 사용하며, `CHAT_GEMINI_FAST_MODEL`로 변경할 수 있습니다. 기본 API 호출은 키가 없거나 호출이 실패하면 로컬 엔진으로 전환하지만, 과제 첨삭에 `require_ai=true`를 지정하면 로컬 결과를 반환하지 않고 키 누락은 HTTP 503, AI 호출 실패는 HTTP 502로 응답합니다.

교수 대화의 AcademicBrainAgent와 PersonaStylizerAgent는 각각 최대 2,048 output tokens를 사용합니다. 학술 질문은 핵심 개념, 근거, 예시와 주의점을 포함한 6~10문장을 목표로 하고, 말투 변환 단계는 원문의 길이와 상세함을 유지합니다.

과제 첨삭 입력은 TXT, Markdown, 텍스트 기반 PDF, DOCX를 지원합니다. 파일당 12MB, 추출 텍스트 10만 자 제한이며 과제용 스캔 PDF는 먼저 OCR이 필요합니다.

강의자료 PDF는 별도 `pdf_pipeline`의 Parse → Clean → Chunk → Map → Reduce 흐름으로 처리합니다. 텍스트 PDF는 PyMuPDF로 추출하고 이미지 기반 페이지는 Gemini Vision OCR을 사용합니다. 요약과 메타데이터는 `assignment_feedback_system/data/scholarly_affection.db`의 SQLite에 교수별로 저장하며 원본 PDF 바이트는 저장하지 않습니다. 교수 대화는 해당 교수의 최신 자료 최대 3개, 총 12,000자까지 AcademicBrainAgent의 근거로 자동 사용합니다.

업로드 파일의 SHA-256을 회원·교수 범위에서 비교합니다. 같은 PDF가 이미 저장돼 있으면 Parse/OCR/요약을 다시 호출하지 않고 기존 레코드와 요약을 즉시 반환합니다. 해시 컬럼이 없던 기존 레코드는 동일 파일명과 크기가 확인되면 최초 재업로드 시 해시를 보강한 뒤 캐시로 사용합니다.

강의 음성 분석은 데모 모드입니다. 업로드된 오디오의 파일명과 크기만 확인하고 실제 STT나 외부 오디오 분석을 호출하지 않으며, `scholarly-affection/transcript.txt`를 고정 전문으로 사용해 교수 말투 특징을 반환합니다.

Gemini 교수 대화가 성공하면 학술 답변 원본과 교수 말투 변환 결과를 `assignment_feedback_system/logs/professor_chat_responses.jsonl`에 한 대화당 한 줄씩 누적합니다. 기록에는 시간, 교수, 학생 질문, 의도, 사용 모델, 참고 강의자료도 포함됩니다. 저장 경로는 `PROFESSOR_CHAT_LOG_PATH` 환경변수로 변경할 수 있습니다.

## 폴더 구조

- `assignment_grader/main.py`: 단일 FastAPI 앱 조립
- `assignment_grader/database.py`: 회원·세션·교수 통합 SQLite 스키마
- `assignment_grader/auth.py`: Argon2id 비밀번호와 서버 세션 처리
- `assignment_grader/professor_store.py`: 회원별 교수 프로필·페르소나 저장소
- `assignment_grader/routers/`: system, assignments, materials, chat 도메인 라우터
- `assignment_grader/material_store.py`: 강의자료 요약 SQLite 저장·조회
- `assignment_grader/lecture_materials.py`: 기존 `pdf_pipeline` FastAPI 어댑터
- `assignment_grader/lecture_audio.py`: 고정 transcript 기반 강의 음성 모의 분석
- `assignment_grader/engine.py`: 과제 첨삭 엔진
- `assignment_grader/professor_chat.py`: 교수 대화 엔진
- `assignment_grader/professor_chat_log.py`: 학술 답변 원본·말투 변환 결과 누적 기록
- `assignment_grader/static/`: 독립 첨삭 확인 UI
- `tests/`: API와 엔진 테스트

새 가상환경에서 독립 설치하려면 다음 명령을 사용합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn assignment_grader.main:app --port 8010
```
