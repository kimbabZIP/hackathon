const API_BASE = import.meta.env.VITE_SCHOLARLY_API_BASE || "/scholarly-api";

const DEFAULT_TIMEOUT_MS = 90_000;
const PDF_TIMEOUT_MS = 6 * 60_000;
const AUDIO_TIMEOUT_MS = 2 * 60_000;

export class ScholarlyApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ScholarlyApiError";
    this.status = status;
  }
}

function errorMessage(payload, status, fallback) {
  const detail = payload && typeof payload === "object" ? payload.detail : null;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => item?.msg)
      .filter((item) => typeof item === "string" && item.trim());
    if (messages.length) return messages.join("\n");
  }
  return fallback || `서버 요청에 실패했습니다. (HTTP ${status})`;
}

async function requestJson(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  let timedOut = false;
  const abortFromExternal = () => controller.abort();
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      throw new ScholarlyApiError(errorMessage(payload, response.status), response.status);
    }
    if (payload === null) {
      throw new ScholarlyApiError("서버가 비어 있는 응답을 반환했습니다.", response.status);
    }
    return payload;
  } catch (error) {
    if (error instanceof ScholarlyApiError) throw error;
    if (externalSignal?.aborted) {
      throw new DOMException("요청이 취소되었습니다.", "AbortError");
    }
    if (timedOut) throw new ScholarlyApiError("서버 응답 제한 시간을 초과했습니다.");
    throw new ScholarlyApiError("통합 FastAPI 서버에 연결할 수 없습니다. npm run api 실행 상태를 확인해 주세요.");
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

export function getLectureMaterials(professorId, signal) {
  const query = new URLSearchParams({ professor_id: professorId });
  return requestJson(`/materials?${query}`, { method: "GET", signal }, 15_000);
}

export function uploadLectureMaterial({ professorId, title, file, signal }) {
  const body = new FormData();
  body.append("professor_id", professorId);
  body.append("title", title);
  body.append("file", file);
  return requestJson("/materials/summarize", { method: "POST", body, signal }, PDF_TIMEOUT_MS);
}

export function gradeAssignment({ lectureText, assignmentText, submissionFile, signal }) {
  const body = new FormData();
  body.append("lecture_text", lectureText);
  body.append("assignment_text", assignmentText);
  body.append("submission_file", submissionFile);
  return requestJson("/assignments/grade-files", { method: "POST", body, signal });
}

export function sendProfessorChat({ professorId, message, history, persona, signal }) {
  return requestJson("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      professor_id: professorId,
      message,
      history: history.slice(-6).map((item) => ({
        role: item.role,
        content: item.content.slice(-4_000),
      })),
      persona,
    }),
    signal,
  });
}

export function analyzeLectureAudio({ professorId, professorName, department, subject, file, signal }) {
  const body = new FormData();
  body.append("professor_id", professorId);
  body.append("professor_name", professorName);
  body.append("department", department);
  body.append("subject", subject);
  body.append("file", file);
  return requestJson("/audio/analyze", { method: "POST", body, signal }, AUDIO_TIMEOUT_MS);
}
