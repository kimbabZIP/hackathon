@echo off
setlocal
title PROFESSOR AI TWIN
cls

echo ======================================================================
echo   PROFESSOR AI TWIN - Interactive Chat and Assignment Feedback
echo ======================================================================
echo.

rem Detect Python, preferring a local virtual environment.
set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
    echo [INFO] Using Python from .venv.
) else if exist "..\.venv\Scripts\python.exe" (
    set "PY_CMD=..\.venv\Scripts\python.exe"
    echo [INFO] Using Python from the parent .venv.
)

rem Verify that Python can be executed.
"%PY_CMD%" --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or is not available on PATH.
    echo         Install Python 3.10 or newer from https://www.python.org/
    echo.
    pause
    exit /b 1
)

rem Create the environment file when it does not exist.
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy ".env.example" ".env" > nul
    ) else (
        echo GEMINI_API_KEY= > ".env"
    )
    echo.
    echo ======================================================================
    echo [ACTION REQUIRED] Set your Google Gemini API key in the .env file.
    echo   1. Open the newly created .env file.
    echo   2. Add the key after GEMINI_API_KEY= and save the file.
    echo   Free key: https://aistudio.google.com/app/apikey
    echo ======================================================================
    echo.
    start "" /wait notepad.exe ".env"
    echo Press any key to continue after saving .env.
    pause > nul
)

rem Install required packages if imports fail.
echo [INFO] Checking required Python packages...
"%PY_CMD%" -c "import google.generativeai, pydantic, tenacity, dotenv" > nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing missing packages from requirements.txt...
    "%PY_CMD%" -m pip install -r "requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Package installation failed. Check the error above.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Professor AI Twin...
echo ======================================================================
echo.

"%PY_CMD%" "run_interactive_professor.py"
set "APP_EXIT=%ERRORLEVEL%"

if not "%APP_EXIT%"=="0" (
    echo.
    echo [ERROR] The program exited with code %APP_EXIT%.
    echo         Review the error message above.
)

echo.
pause
exit /b %APP_EXIT%
