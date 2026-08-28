$ErrorActionPreference = 'Stop'
$systemRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $systemRoot
$unifiedLauncher = Join-Path $workspaceRoot 'scholarly-affection\run_api.ps1'

if (-not (Test-Path -LiteralPath $unifiedLauncher -PathType Leaf)) {
    throw "통합 Scholarly Affection API 실행기를 찾을 수 없습니다: $unifiedLauncher"
}

Write-Warning 'run_assignment_grader.ps1은 호환용입니다. 앞으로 scholarly-affection에서 npm run api를 사용하세요.'
& $unifiedLauncher
