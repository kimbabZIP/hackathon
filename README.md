# 교수 리서치 노트

대학명과 교수명을 입력하면 공개 웹에서 공식 교수 프로필 후보를 찾고, 사용자가 대상을 확정한 뒤 연혁과 연구 내용을 출처와 함께 정리하는 FastAPI MVP입니다.

## 실행

PowerShell 기준:

```powershell
C:\Users\bman4\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
# .env의 GEMINI_API_KEY에 새로 발급한 키를 입력합니다.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

브라우저에서 http://127.0.0.1:8000 을 엽니다.

## 테스트

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

기본 검색 폼에는 수용 테스트 값인 `조선대`, `송기범`이 미리 입력되어 있습니다.

조선대학교 검색은 공식 통합 교직원검색과 학과 교수 디렉터리를 Google보다 먼저 확인합니다. Google이 자동 검색을 일시 제한하면 결과 화면의 `Google에서 이 검색 열기`로 일반 검색 결과를 확인한 뒤 공식 대학 URL을 붙여 넣을 수도 있습니다. 서비스는 붙여 넣은 URL의 HTTPS·대학 도메인·DNS를 다시 검증합니다.

## 데이터 흐름

1. 로컬 headless Edge의 Google 검색, Gemini grounding 또는 Naver Search API로 후보 검색
2. 조선대학교의 경우 `chosun.ac.kr`과 하위 도메인만 공식 후보로 표시
3. 사용자가 이름·대학·학과를 확인하고 후보 확정
4. HTTPS, DNS, 리다이렉트, `robots.txt`, 응답 크기를 검증한 뒤 공식 페이지 수집
5. Gemini 구조화 출력과 Pydantic으로 연혁·연구 내용 추출
6. 실제 출처 ID와 근거 문구를 검증한 항목만 SQLite 저장
7. OpenAlex 저자를 사용자가 별도로 확정하면 주요 논문 최대 5편 저장

## 주요 경로

- `app/main.py`: 웹·JSON API
- `app/models.py`: 교수·출처·연혁·연구·논문·작업 테이블
- `app/services/search/`: 검색 제공자
- `app/services/crawl/`: URL 보안, robots, HTML 수집·정제
- `app/services/enrichment/`: Gemini, OpenAlex, 백그라운드 파이프라인
- `app/templates/`, `app/static/`: 웹 화면
- `tests/`: 단위·웹 스모크 테스트

## 보안 메모

- `.env`는 `.gitignore`에 포함되어 있습니다.
- API 키는 서버 환경변수에서만 읽으며 브라우저와 로그로 보내지 않습니다.
- 채팅이나 공유 문서에 노출된 키는 폐기하고 새 키로 교체해야 합니다.
- 비공개 페이지, CAPTCHA, 로그인, 유료 논문 접근을 우회하지 않습니다.
- Google 브라우저 검색은 로컬 MVP용 폴백입니다. CAPTCHA나 자동 검색 제한이 감지되면 우회하지 않고 실패합니다.
"# hackathon" 
