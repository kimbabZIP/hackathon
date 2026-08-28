$ErrorActionPreference = 'Stop'
$frontendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $frontendRoot
$pythonPath = Join-Path $workspaceRoot '.venv\Scripts\python.exe'
$apiRoot = Join-Path $workspaceRoot 'assignment_feedback_system'

if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
    throw "Python 가상환경을 찾을 수 없습니다: $pythonPath"
}
if (-not (Test-Path -LiteralPath $apiRoot -PathType Container)) {
    throw "통합 API 폴더를 찾을 수 없습니다: $apiRoot"
}

Set-Location -LiteralPath $apiRoot
& $pythonPath -m uvicorn assignment_grader.main:app --host 127.0.0.1 --port 8010
