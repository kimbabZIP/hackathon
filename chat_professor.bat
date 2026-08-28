@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title PROFESSOR AI TWIN (교수 AI 트윈 콘솔)
cls

echo ======================================================================
echo   🎓 교수 AI 트윈 실시간 대화 & 과제 첨삭 콘솔 실행기
echo ======================================================================
echo.

REM 1. 파이썬 실행 경로 감지 (가상환경 우선)
set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
    echo [INFO] 가상환경(.venv) 파이썬을 감지했습니다.
) else if exist "..\.venv\Scripts\python.exe" (
    set "PY_CMD=..\.venv\Scripts\python.exe"
    echo [INFO] 상위 가상환경(.venv) 파이썬을 감지했습니다.
)

REM 2. 파이썬 설치 여부 확인
%PY_CMD% --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] 파이썬(Python)이 설치되어 있지 않거나 PATH에 등록되지 않았습니다.
    echo         Python 3.10 이상을 설치해주세요: https://www.python.org/
    echo.
    pause
    exit /b 1
)

REM 3. .env 환경변수 파일 확인
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env 파일이 없어 .env.example로부터 새로 생성합니다...
        copy ".env.example" ".env" > nul
    ) else (
        echo GEMINI_API_KEY= > .env
    )
    echo.
    echo ======================================================================
    echo ⚠️ [.env 파일에 Google Gemini API 키 설정이 필요합니다]
    echo   1. 새로 생성된 .env 파일을 메모장으로 엽니다.
    echo   2. GEMINI_API_KEY= 뒤에 발급받으신 키를 붙여넣고 저장하세요.
    echo   (무료 키 발급: https://aistudio.google.com/app/apikey)
    echo ======================================================================
    echo.
    notepad .env
    echo .env 파일을 저장하신 후 아무 키나 누르시면 실행을 계속합니다.
    pause > nul
)

REM 4. 필수 의존성 패키지 자동 설치 체크
echo [INFO] 필수 라이브러리 설치 상태 확인 중...
%PY_CMD% -c "import google.generativeai, pydantic, tenacity, dotenv" > nul 2>&1
if errorlevel 1 (
    echo [INFO] 필수 패키지가 누락되어 자동 설치를 진행합니다 (pip install -r requirements.txt)...
    %PY_CMD% -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] 패키지 설치 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.
        pause
        exit /b 1
    )
)

echo [INFO] 교수 AI 트윈 엔진을 가동합니다!
echo ======================================================================
echo.

%PY_CMD% run_interactive_professor.py

if errorlevel 1 (
    echo.
    echo [ERROR] 실행 중 오류가 발생했습니다. 위의 에러 메시지를 확인해주세요.
)

echo.
pause
