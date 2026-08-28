# 잔혹 과제 피드백 Frontend

## 실행

백엔드와 프론트엔드는 각각 별도 터미널에서 실행합니다.

```powershell
npm run api
```

```powershell
npm run dev
```

Vite는 `/scholarly-api/*` 요청을 기본적으로 `http://127.0.0.1:8010/api/*`로 전달합니다. 백엔드 주소는 `.env`의 `SCHOLARLY_API_TARGET`으로 변경할 수 있습니다.

## 연구실 기능

- 교수 대화: `POST /api/chat`
- 과제 첨삭: 최신 서버 강의자료 요약을 불러온 뒤 `POST /api/assignments/grade-files`
- 강의자료: PDF를 `POST /api/materials/summarize`로 요약하고 SQLite에 저장
- 강의 음성: `POST /api/audio/analyze`로 전송하되 실제 STT는 호출하지 않고 `scholarly-affection/transcript.txt`를 사용

로그인과 회원가입 기능은 현재 제외되어 첫 화면에서 바로 시작합니다.
