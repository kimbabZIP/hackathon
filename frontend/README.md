# 잔혹 과제 피드백 Frontend

## 실행

백엔드와 프론트엔드는 각각 별도 터미널에서 실행합니다.

\`\`\`powershell
npm run api
\`\`\`

\`\`\`powershell
npm run dev
\`\`\`

기본적으로 브라우저는 같은 출처의 `/scholarly-api/*`로 요청하며, 로컬 Vite 또는
Vercel rewrite가 이를 `http://3.122.56.68:8010/api/*`로 전달합니다.
브라우저가 사용할 API 주소는 `.env`의 `VITE_SCHOLARLY_API_BASE`로, 로컬 Vite
프록시 대상은 `SCHOLARLY_API_TARGET`으로 변경할 수 있습니다.

로그인과 회원가입은 SQLite 기반 FastAPI 인증 API를 사용하며, 로그인
세션은 HttpOnly 쿠키로 유지됩니다.
