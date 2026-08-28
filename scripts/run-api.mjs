import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = join(workspaceRoot, "assignment_feedback_system");
const configuredPython = process.env.SCHOLARLY_PYTHON?.trim();
const venvPython = process.platform === "win32"
  ? join(workspaceRoot, ".venv", "Scripts", "python.exe")
  : join(workspaceRoot, ".venv", "bin", "python");
const pythonCommand = configuredPython || venvPython;

if (!existsSync(apiRoot)) {
  console.error(`통합 API 폴더를 찾을 수 없습니다: ${apiRoot}`);
  process.exit(1);
}

if (!configuredPython && !existsSync(venvPython)) {
  const setupCommand = process.platform === "win32"
    ? "python -m venv .venv"
    : "python3 -m venv .venv";
  console.error(`Python 가상환경을 찾을 수 없습니다: ${venvPython}`);
  console.error(`워크스페이스 루트에서 '${setupCommand}'를 실행하고 requirements.txt를 설치해 주세요.`);
  console.error("별도 Python은 SCHOLARLY_PYTHON 환경변수로 지정할 수 있습니다.");
  process.exit(1);
}

const host = process.env.SCHOLARLY_API_HOST?.trim() || "127.0.0.1";
const port = process.env.SCHOLARLY_API_PORT?.trim() || "8010";

if (process.argv.includes("--check")) {
  console.log(`Python: ${pythonCommand}`);
  console.log(`API root: ${apiRoot}`);
  console.log(`Address: http://${host}:${port}`);
  process.exit(0);
}

const child = spawn(
  pythonCommand,
  ["-m", "uvicorn", "assignment_grader.main:app", "--host", host, "--port", port],
  { cwd: apiRoot, env: process.env, stdio: "inherit", windowsHide: true },
);

child.once("error", (error) => {
  console.error(`FastAPI 서버를 시작하지 못했습니다: ${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    if (!child.killed) child.kill(process.platform === "win32" ? "SIGTERM" : signal);
  });
}
