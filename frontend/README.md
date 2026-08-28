# 잔혹 과제 피드백 Frontend

## 실행

백엔드와 프론트엔드는 각각 별도 터미널에서 실행합니다.

\`\`\`powershell
npm run api
\`\`\`

\`\`\`powershell
npm run dev
\`\`\`

Vite는 \`/scholarly-api/*\` 요청을 기본적으로
\`http://127.0.0.1:8010/api/*\`로 전달합니다. 백엔드 주소는
\`.env\`의 \`SCHOLARLY_API_TARGET\`으로 변경할 수 있습니다.

로그인과 회원가입은 SQLite 기반 FastAPI 인증 API를 사용하며, 로그인
세션은 HttpOnly 쿠키로 유지됩니다.
