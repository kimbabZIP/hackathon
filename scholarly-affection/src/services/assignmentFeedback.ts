import {
  AssignmentFeedbackHealth,
  AssignmentFeedbackInput,
  AssignmentFeedbackReport,
  FeedbackCriterion,
  FeedbackLineEdit,
} from '../types';

const API_BASE = '/assignment-feedback-api';
const REQUEST_TIMEOUT_MS = 90_000;

export const ASSIGNMENT_FILE_ACCEPT = '.txt,.md,.pdf,.docx';
export const ASSIGNMENT_MAX_FILE_BYTES = 12 * 1024 * 1024;

const FIELD_NAMES = {
  lecture: { text: 'lecture_text', file: 'lecture_file' },
  assignment: { text: 'assignment_text', file: 'assignment_file' },
  submission: { text: 'submission_text', file: 'submission_file' },
} as const;

export class AssignmentFeedbackApiError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AssignmentFeedbackApiError';
    this.status = status;
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const data = item as { loc?: unknown; msg?: unknown };
          const field = Array.isArray(data.loc) ? data.loc.at(-1) : null;
          const message = typeof data.msg === 'string' ? data.msg : null;
          if (!message) return null;
          return field ? `${String(field)}: ${message}` : message;
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join('\n');
    }
  }

  if (status === 422) return '입력한 자료의 형식이나 길이를 확인해 주세요.';
  if (status >= 500) return '첨삭 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  return `첨삭 요청에 실패했습니다. (HTTP ${status})`;
}

async function requestJson(
  path: string,
  init: RequestInit,
  externalSignal?: AbortSignal,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener('abort', abortFromExternal, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      throw new AssignmentFeedbackApiError(errorMessage(payload, response.status), response.status);
    }
    if (payload === null) {
      throw new AssignmentFeedbackApiError('첨삭 서버가 비어 있는 응답을 반환했습니다.', response.status);
    }
    return payload;
  } catch (error) {
    if (error instanceof AssignmentFeedbackApiError) throw error;
    if (externalSignal?.aborted) {
      throw new DOMException('요청이 취소되었습니다.', 'AbortError');
    }
    if (timedOut) {
      throw new AssignmentFeedbackApiError('첨삭 요청 시간이 90초를 초과했습니다. 다시 시도해 주세요.');
    }
    throw new AssignmentFeedbackApiError('과제 첨삭 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCriterion(value: unknown): value is FeedbackCriterion {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    typeof value.max_score === 'number' &&
    Number.isFinite(value.max_score) &&
    value.max_score > 0 &&
    typeof value.feedback === 'string' &&
    typeof value.evidence === 'string'
  );
}

function isLineEdit(value: unknown): value is FeedbackLineEdit {
  if (!isRecord(value)) return false;
  return (
    typeof value.original === 'string' &&
    typeof value.revised === 'string' &&
    typeof value.reason === 'string'
  );
}

function parseFeedbackReport(payload: unknown): AssignmentFeedbackReport {
  if (!isRecord(payload)) {
    throw new AssignmentFeedbackApiError('첨삭 결과의 형식이 올바르지 않습니다.');
  }

  const isValid =
    typeof payload.title === 'string' &&
    typeof payload.total_score === 'number' &&
    payload.total_score >= 0 &&
    payload.total_score <= 100 &&
    typeof payload.grade === 'string' &&
    typeof payload.summary === 'string' &&
    Array.isArray(payload.criteria) &&
    payload.criteria.every(isCriterion) &&
    stringArray(payload.strengths) &&
    stringArray(payload.priorities) &&
    stringArray(payload.misconceptions) &&
    Array.isArray(payload.line_edits) &&
    payload.line_edits.every(isLineEdit) &&
    typeof payload.improved_example === 'string' &&
    typeof payload.engine === 'string' &&
    typeof payload.caution === 'string';

  if (!isValid) {
    throw new AssignmentFeedbackApiError('첨삭 서버의 응답 필드가 예상 형식과 다릅니다.');
  }
  return payload as unknown as AssignmentFeedbackReport;
}

export async function getAssignmentFeedbackHealth(
  signal?: AbortSignal,
): Promise<AssignmentFeedbackHealth> {
  const payload = await requestJson('/health', { method: 'GET' }, signal, 10_000);
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    typeof payload.ai_enabled !== 'boolean'
  ) {
    throw new AssignmentFeedbackApiError('첨삭 서버 상태 응답이 올바르지 않습니다.');
  }
  return payload as unknown as AssignmentFeedbackHealth;
}

export async function gradeAssignment(
  input: AssignmentFeedbackInput,
  signal?: AbortSignal,
): Promise<AssignmentFeedbackReport> {
  const allText = Object.values(input).every((source) => source.mode === 'text');

  if (allText) {
    const payload = await requestJson(
      '/grade',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecture_summary: input.lecture.text.trim(),
          assignment_prompt: input.assignment.text.trim(),
          student_submission: input.submission.text.trim(),
        }),
      },
      signal,
    );
    return parseFeedbackReport(payload);
  }

  const formData = new FormData();
  (Object.keys(input) as Array<keyof AssignmentFeedbackInput>).forEach((key) => {
    const source = input[key];
    const names = FIELD_NAMES[key];
    if (source.mode === 'file' && source.file) {
      formData.append(names.file, source.file);
    } else if (source.mode === 'text') {
      formData.append(names.text, source.text.trim());
    }
  });

  const payload = await requestJson(
    '/grade-files',
    { method: 'POST', body: formData },
    signal,
  );
  return parseFeedbackReport(payload);
}
