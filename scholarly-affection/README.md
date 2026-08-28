# Scholarly Affection

지도 교수와의 대화, 과제 첨삭, 강의 자료와 음성 기록을 제공하는 React 웹 애플리케이션입니다.

## 실행

과제 첨삭 기능은 작업공간의 `assignment_feedback_system` FastAPI 서버를 사용합니다. PowerShell 두 개에서 백엔드와 프론트엔드를 각각 실행합니다.

### 1. 과제 첨삭 백엔드

```powershell
cd "C:\Users\bman4\Desktop\새 폴더"
.\assignment_feedback_system\run_assignment_grader.ps1
```

Gemini 정밀 첨삭을 사용하려면 같은 PowerShell에서 실행 전에 키를 설정합니다. 키가 없거나 호출에 실패하면 로컬 규칙 엔진이 사용됩니다.

```powershell
$env:GRADE_GEMINI_API_KEY="실제 키"
$env:GRADE_GEMINI_MODEL="gemini-2.5-flash"
.\assignment_feedback_system\run_assignment_grader.ps1
```

### 2. React 프론트엔드

다른 PowerShell에서 실행합니다.

```powershell
cd "C:\Users\bman4\Desktop\새 폴더\scholarly-affection"
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

Vite 개발 서버는 `/assignment-feedback-api/*` 요청을 기본적으로 `http://127.0.0.1:8010/api/*`에 프록시합니다. 다른 백엔드 주소를 사용하려면 프론트 실행 전에 `ASSIGNMENT_FEEDBACK_TARGET` 환경 변수를 설정합니다.

## 확인 명령

```powershell
npm run lint
npm run build
```

백엔드 테스트:

```powershell
cd "C:\Users\bman4\Desktop\새 폴더\assignment_feedback_system"
..\.venv\Scripts\python.exe -m pytest .\tests -q
```

## 상세 문서

- [웹 애플리케이션 구조 명세](./SPEC.md)
- [과제 첨삭 연동 명세](./ASSIGNMENT_FEEDBACK_INTEGRATION_SPEC.md)
