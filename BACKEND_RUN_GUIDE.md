# Scholarly Affection 백엔드 실행 가이드

이 프로젝트의 백엔드는 `assignment_feedback_system`에 있는 FastAPI 애플리케이션입니다. 권장 실행 방법은 `frontend` 또는 `scholarly-affection` 폴더에서 `npm run api`를 사용하는 것입니다.

`npm run api`는 백엔드만 실행합니다. 프론트엔드는 별도 터미널에서 `npm run dev`로 실행해야 합니다.

## 기본 구성

- FastAPI 앱: `assignment_feedback_system/assignment_grader/main.py`
- 기본 주소: `http://127.0.0.1:8010`
- API 문서: `http://127.0.0.1:8010/docs`
- 상태 확인: `GET http://127.0.0.1:8010/api/health`
- SQLite DB: `assignment_feedback_system/data/scholarly_affection.db`
- Python 의존성: `assignment_feedback_system/requirements.txt`
- 공용 실행기: `scripts/run-api.mjs`

## Windows 최초 설치

PowerShell에서 워크스페이스 루트로 이동합니다.

```powershell
cd "C:\Users\bman4\Desktop\새 폴더"
```

Python 가상환경을 만들고 패키지를 설치합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r .\assignment_feedback_system\requirements.txt
```

백엔드를 실행합니다.

```powershell
cd .\frontend
npm run api
```

`scholarly-affection` 프론트엔드를 사용하는 경우에도 같은 명령을 사용할 수 있습니다.

```powershell
cd .\scholarly-affection
npm run api
```

## Linux/macOS 최초 설치

터미널에서 워크스페이스 루트로 이동합니다.

```bash
cd /path/to/workspace
```

Python 가상환경을 만들고 패키지를 설치합니다.

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r assignment_feedback_system/requirements.txt
```

Ubuntu/Debian에서 가상환경 생성 기능이 없다면 먼저 `python3-venv` 패키지를 설치해야 합니다.

백엔드를 실행합니다.

```bash
cd frontend
npm run api
```

또는 다음 프론트엔드 폴더에서도 실행할 수 있습니다.

```bash
cd scholarly-affection
npm run api
```

공용 실행기는 운영체제에 따라 다음 Python을 자동 선택합니다.

| 운영체제 | 기본 Python 경로 |
|---|---|
| Windows | `.venv\Scripts\python.exe` |
| Linux/macOS | `.venv/bin/python` |

## 실행 전 점검

서버를 실제로 시작하지 않고 경로와 설정만 확인할 수 있습니다.

```bash
npm run api -- --check
```

정상적인 출력 예시는 다음과 같습니다.

```text
API launcher ready (linux)
Python: /path/to/workspace/.venv/bin/python
API root: /path/to/workspace/assignment_feedback_system
Address: http://127.0.0.1:8010
```

## 환경변수 설정

공통 Gemini 키는 `assignment_feedback_system/.env`에 설정할 수 있습니다.

```dotenv
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-model-name
```

기능별로 키와 모델을 분리하려면 다음 변수를 사용합니다.

```dotenv
GRADE_GEMINI_API_KEY=your_grade_key
GRADE_GEMINI_MODEL=gemini-model-name

CHAT_GEMINI_API_KEY=your_chat_key
CHAT_GEMINI_MODEL=gemini-model-name
CHAT_GEMINI_FAST_MODEL=gemini-fast-model-name
```

- `GRADE_GEMINI_*`: 과제 첨삭
- `CHAT_GEMINI_*`: 교수 대화
- `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`: PDF OCR·요약
- 키가 없는 기능은 로컬 엔진으로 전환될 수 있습니다. 단, `require_ai=true`인 과제 첨삭 요청은 AI 실패를 오류로 반환합니다.

`.env` 파일은 저장소에 커밋하지 않습니다.

## 주소·포트 변경

기본 주소는 `127.0.0.1:8010`입니다. Linux 서버, VM 또는 컨테이너에서 외부 요청을 받으려면 다음처럼 실행합니다.

```bash
SCHOLARLY_API_HOST=0.0.0.0 SCHOLARLY_API_PORT=8010 npm run api
```

Windows PowerShell에서는 다음과 같이 설정합니다.

```powershell
$env:SCHOLARLY_API_HOST="0.0.0.0"
$env:SCHOLARLY_API_PORT="8010"
npm run api
```

다른 Python 실행 파일을 사용하려면 `SCHOLARLY_PYTHON`을 지정합니다.

```bash
SCHOLARLY_PYTHON=python3.12 npm run api
```

```powershell
$env:SCHOLARLY_PYTHON="C:\Python312\python.exe"
npm run api
```

프론트엔드의 API 서버 주소는 Vercel 환경변수 없이 `frontend/vite.config.js`와
`frontend/vercel.json`에서 관리합니다. 현재 대상은 `http://3.122.56.68:8010/api`입니다.

## 실행 확인

브라우저에서 다음 주소를 엽니다.

- 로컬 상태 확인: `http://127.0.0.1:8010/api/health`
- 로컬 Swagger UI: `http://127.0.0.1:8010/docs`

Windows PowerShell:

```powershell
curl.exe http://127.0.0.1:8010/api/health
```

Linux/macOS:

```bash
curl http://127.0.0.1:8010/api/health
```

정상이면 응답에 다음 값이 포함됩니다.

```json
{
  "status": "ok"
}
```

## 프론트엔드까지 함께 실행

첫 번째 터미널에서 백엔드를 실행합니다.

```bash
cd frontend
npm run api
```

두 번째 터미널에서 프론트엔드를 실행합니다.

```bash
cd frontend
npm run dev
```

`npm run api` 하나로 백엔드와 프론트엔드가 동시에 실행되지는 않습니다.

## 직접 FastAPI 실행

Node/npm 실행기를 사용하지 않고 Python으로 직접 실행할 수도 있습니다.

Windows:

```powershell
cd .\assignment_feedback_system
..\.venv\Scripts\python.exe -m uvicorn assignment_grader.main:app --host 127.0.0.1 --port 8010
```

Linux/macOS:

```bash
cd assignment_feedback_system
../.venv/bin/python -m uvicorn assignment_grader.main:app --host 127.0.0.1 --port 8010
```

개발 중 코드 변경을 자동 반영하려면 마지막에 `--reload`를 추가합니다.

## 서버 종료

서버를 실행한 터미널에서 `Ctrl+C`를 누릅니다. SQLite DB와 업로드된 요약 데이터는 삭제되지 않습니다.

## 자주 발생하는 오류

### Python 가상환경을 찾을 수 없음

워크스페이스 루트에 `.venv`가 없거나 다른 운영체제에서 만든 가상환경을 그대로 복사한 경우입니다. 현재 운영체제에서 가상환경을 다시 만듭니다.

```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r assignment_feedback_system/requirements.txt
```

Windows에서 만든 `.venv`는 Linux에서 사용할 수 없고, Linux에서 만든 `.venv`도 Windows에서 그대로 사용할 수 없습니다.

### `No module named uvicorn` 오류

선택된 Python 환경에 백엔드 패키지가 설치되지 않은 상태입니다.

```bash
./.venv/bin/python -m pip install -r assignment_feedback_system/requirements.txt
```

Windows에서는 `./.venv/bin/python` 대신 `.\.venv\Scripts\python.exe`를 사용합니다.

### 8010 포트를 이미 사용 중

기존 백엔드를 종료하거나 다른 포트로 실행합니다.

```bash
SCHOLARLY_API_PORT=8011 npm run api
```

포트를 변경했다면 `frontend/vite.config.js`와 `frontend/vercel.json`의 주소도 함께 변경합니다.

### 프론트엔드에서 백엔드 연결 실패

다음 항목을 확인합니다.

1. `/api/health`가 `200 OK`를 반환하는지 확인합니다.
2. 백엔드 포트와 `SCHOLARLY_API_TARGET`이 일치하는지 확인합니다.
3. Linux 서버의 방화벽 또는 클라우드 보안 그룹이 해당 포트를 허용하는지 확인합니다.
4. 원격 접속이면 `SCHOLARLY_API_HOST=0.0.0.0`으로 실행했는지 확인합니다.

현재 통합 실행 스크립트는 원격 배포를 위해 기본적으로 `0.0.0.0:8010`에 바인딩합니다.
AWS EC2에서는 보안 그룹의 인바운드 TCP 8010 포트도 허용해야 합니다.

### PDF 요약 또는 AI 대화 실패

`assignment_feedback_system/.env`의 Gemini 키를 확인합니다. 텍스트 기반 PDF는 키 없이 일부 처리가 가능하지만, 이미지 기반 PDF의 OCR과 Gemini 기반 요약·대화에는 API 키가 필요할 수 있습니다.

## 운영 환경 참고

- HTTPS 환경에서는 `SESSION_COOKIE_SECURE=true`를 설정합니다.
- 외부 공개 서버는 Uvicorn 포트를 직접 노출하기보다 Nginx 같은 리버스 프록시 뒤에 두는 구성을 권장합니다.
- DB 파일과 `assignment_feedback_system/logs` 디렉터리는 정기적으로 백업합니다.
- API 키와 `.env` 파일은 저장소에 커밋하지 않습니다.
