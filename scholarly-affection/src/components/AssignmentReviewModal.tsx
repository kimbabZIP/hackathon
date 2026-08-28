import React, { useEffect, useRef, useState } from 'react';
import {
  AssignmentFeedbackReport,
  AssignmentGrade,
  AssignmentInputSnapshot,
  AssignmentRecord,
  AssignmentSourceInput as AssignmentSourceValue,
  Professor,
} from '../types';
import {
  AssignmentFeedbackApiError,
  getAssignmentFeedbackHealth,
  gradeAssignment,
} from '../services/assignmentFeedback';
import { soundManager } from '../utils/audio';
import { AssignmentSourceInput } from './AssignmentSourceInput';
import { AssignmentFeedbackResult } from './AssignmentFeedbackResult';

interface AssignmentReviewModalProps {
  professor: Professor;
  assignments: AssignmentRecord[];
  onAddAssignment: (assignment: AssignmentRecord) => boolean;
  onClose: () => void;
}

type SourceKey = 'lecture' | 'assignment' | 'submission';
type HealthState =
  | { status: 'checking' }
  | { status: 'online'; aiEnabled: boolean }
  | { status: 'offline'; message: string };
type GradingState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; report: AssignmentFeedbackReport }
  | { status: 'error'; message: string };

const SOURCE_LIMITS: Record<SourceKey, { min: number; max: number }> = {
  lecture: { min: 20, max: 100_000 },
  assignment: { min: 5, max: 30_000 },
  submission: { min: 5, max: 100_000 },
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  lecture: '강의 요약본',
  assignment: '교수 과제 지시문',
  submission: '학생 제출물',
};

const EMPTY_SOURCE = (): AssignmentSourceValue => ({ mode: 'text', text: '', file: null });
const KNOWN_GRADES = new Set<AssignmentGrade>(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'F']);

function normalizeGrade(grade: string, score: number): AssignmentGrade {
  if (KNOWN_GRADES.has(grade as AssignmentGrade)) return grade as AssignmentGrade;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function localTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function preview(text: string, maxLength: number): string {
  const normalized = text.trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function sourceSnapshot(source: AssignmentSourceValue, maxLength: number): AssignmentInputSnapshot {
  if (source.mode === 'file' && source.file) {
    return {
      mode: 'file',
      fileName: source.file.name,
      fileSize: source.file.size,
      preview: '',
    };
  }
  return { mode: 'text', preview: preview(source.text, maxLength) };
}

function formatBytes(bytes?: number): string {
  if (typeof bytes !== 'number') return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AssignmentReviewModal: React.FC<AssignmentReviewModalProps> = ({
  professor,
  assignments,
  onAddAssignment,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [title, setTitle] = useState('');
  const [lecture, setLecture] = useState<AssignmentSourceValue>(EMPTY_SOURCE);
  const [assignment, setAssignment] = useState<AssignmentSourceValue>(EMPTY_SOURCE);
  const [submission, setSubmission] = useState<AssignmentSourceValue>(EMPTY_SOURCE);
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });
  const [grading, setGrading] = useState<GradingState>({ status: 'idle' });
  const [selectedRecord, setSelectedRecord] = useState<AssignmentRecord | null>(null);
  const [errors, setErrors] = useState<Partial<Record<SourceKey | 'title', string>>>({});
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const healthAbortRef = useRef<AbortController | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  const checkHealth = async () => {
    healthAbortRef.current?.abort();
    const controller = new AbortController();
    healthAbortRef.current = controller;
    setHealth({ status: 'checking' });
    try {
      const result = await getAssignmentFeedbackHealth(controller.signal);
      if (result.status !== 'ok') {
        setHealth({ status: 'offline', message: '첨삭 서버가 준비 상태가 아닙니다.' });
        return;
      }
      setHealth({ status: 'online', aiEnabled: result.ai_enabled });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setHealth({
        status: 'offline',
        message:
          error instanceof Error
            ? error.message
            : '과제 첨삭 서버에 연결할 수 없습니다.',
      });
    }
  };

  useEffect(() => {
    void checkHealth();
    return () => {
      healthAbortRef.current?.abort();
      requestAbortRef.current?.abort();
    };
  }, []);

  const handleClose = () => {
    if (
      grading.status === 'submitting' &&
      !window.confirm('진행 중인 첨삭 요청을 취소하고 닫을까요?')
    ) {
      return;
    }
    requestAbortRef.current?.abort();
    onClose();
  };

  const updateSource = (key: SourceKey, value: AssignmentSourceValue) => {
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    if (key === 'lecture') setLecture(value);
    if (key === 'assignment') setAssignment(value);
    if (key === 'submission') {
      setSubmission(value);
      if (value.mode === 'file' && value.file && !title.trim()) {
        setTitle(value.file.name.replace(/\.[^/.]+$/, '').slice(0, 120));
      }
    }
  };

  const sourceError = (key: SourceKey, value: AssignmentSourceValue): string | null => {
    const { min, max } = SOURCE_LIMITS[key];
    if (value.mode === 'file') {
      return value.file ? null : `${SOURCE_LABELS[key]} 파일을 선택해 주세요.`;
    }
    const length = value.text.trim().length;
    if (length < min) return `${SOURCE_LABELS[key]}을 ${min}자 이상 입력해 주세요.`;
    if (length > max) return `${SOURCE_LABELS[key]}은 ${max.toLocaleString()}자를 넘을 수 없습니다.`;
    return null;
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<SourceKey | 'title', string>> = {};
    if (!title.trim()) nextErrors.title = '기록 제목을 입력해 주세요.';
    if (title.trim().length > 120) nextErrors.title = '기록 제목은 120자 이하여야 합니다.';

    const values = { lecture, assignment, submission };
    (Object.keys(values) as SourceKey[]).forEach((key) => {
      const message = sourceError(key, values[key]);
      if (message) nextErrors[key] = message;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createRecord = (report: AssignmentFeedbackReport): AssignmentRecord => {
    const snapshots = {
      lecture: sourceSnapshot(lecture, 500),
      assignment: sourceSnapshot(assignment, 500),
      submission: sourceSnapshot(submission, 2_000),
    };
    const assignmentTopic =
      assignment.mode === 'file'
        ? assignment.file?.name || `${professor.field} 과제`
        : preview(assignment.text, 80);
    const submissionContent =
      submission.mode === 'file'
        ? `[파일 제출] ${submission.file?.name || '학생 제출물'}`
        : snapshots.submission.preview;

    return {
      id: `asg-${Date.now()}`,
      professorId: professor.id,
      title: title.trim(),
      topic: assignmentTopic,
      content: submissionContent,
      grade: normalizeGrade(report.grade, report.total_score),
      score: report.total_score,
      summaryFeedback: report.summary,
      annotations: report.line_edits.map((edit) => ({
        text: edit.original,
        note: `${edit.revised} — ${edit.reason}`,
        type: 'critique' as const,
      })),
      timestamp: localTimestamp(),
      affectionGained: 15,
      schemaVersion: 2,
      inputSnapshots: snapshots,
      feedbackReport: report,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (health.status !== 'online' || !validate()) return;

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setSaveWarning(null);
    setGrading({ status: 'submitting' });
    soundManager.playPageTurn();

    try {
      const report = await gradeAssignment(
        { lecture, assignment, submission },
        controller.signal,
      );
      const record = createRecord(report);
      const saved = onAddAssignment(record);
      soundManager.playGradeChime();
      if (saved) {
        soundManager.playAffectionUp();
      } else {
        setSaveWarning(
          '첨삭 결과는 생성되었지만 브라우저 저장 공간이 부족해 기록과 교수 스탯에 반영하지 못했습니다.',
        );
      }
      setGrading({ status: 'success', report });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message =
        error instanceof AssignmentFeedbackApiError || error instanceof Error
          ? error.message
          : '첨삭 요청 중 알 수 없는 오류가 발생했습니다.';
      setGrading({ status: 'error', message });
    }
  };

  const resetForm = () => {
    requestAbortRef.current?.abort();
    setTitle('');
    setLecture(EMPTY_SOURCE());
    setAssignment(EMPTY_SOURCE());
    setSubmission(EMPTY_SOURCE());
    setErrors({});
    setSaveWarning(null);
    setGrading({ status: 'idle' });
    setActiveTab('submit');
  };

  const renderHealth = () => {
    if (health.status === 'checking') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eae1d5] px-3 py-1 font-ui-label text-xs font-bold text-[#44474d]">
          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
          첨삭 엔진 확인 중
        </span>
      );
    }
    if (health.status === 'online') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-ui-label text-xs font-bold ${
            health.aiEnabled
              ? 'bg-[#d5e3ff] text-[#04162e]'
              : 'bg-[#ffdea5] text-[#775a19]'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {health.aiEnabled ? 'auto_awesome' : 'rule'}
          </span>
          {health.aiEnabled ? 'AI 키 감지됨' : '로컬 첨삭 모드'}
        </span>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-ui-label text-xs font-bold text-[#ba1a1a]">
          <span className="material-symbols-outlined text-sm">cloud_off</span>
          첨삭 서버 연결 필요
        </span>
        <button
          type="button"
          onClick={() => void checkHealth()}
          className="font-ui-label text-xs font-bold text-[#775a19] underline underline-offset-2"
        >
          다시 확인
        </button>
      </div>
    );
  };

  const renderInputSnapshot = (label: string, snapshot: AssignmentInputSnapshot) => (
    <div className="rounded-lg border border-[#c5c6ce] bg-[#f6ede0]/50 p-3">
      <span className="font-ui-label text-xs font-bold text-[#775a19]">{label}</span>
      {snapshot.mode === 'file' ? (
        <p className="mt-1 font-dialogue-text text-sm text-[#1f1b14]">
          {snapshot.fileName} {snapshot.fileSize ? `(${formatBytes(snapshot.fileSize)})` : ''}
        </p>
      ) : (
        <p className="mt-1 line-clamp-3 whitespace-pre-line font-dialogue-text text-sm text-[#44474d]">
          {snapshot.preview || '저장된 미리보기가 없습니다.'}
        </p>
      )}
    </div>
  );

  const renderLegacyRecord = (record: AssignmentRecord) => (
    <div className="space-y-4 rounded-xl border border-[#775a19] bg-[#fff8f2] p-5 shadow-md">
      <div className="flex justify-between gap-4 border-b border-[#c5c6ce] pb-3">
        <div>
          <span className="font-ui-label text-xs font-bold text-[#775a19]">
            {record.topic} • {record.timestamp}
          </span>
          <h4 className="mt-1 font-speaker-name text-xl font-bold text-[#04162e]">
            {record.title}
          </h4>
        </div>
        <div className="self-start rounded-xl border border-[#775a19] bg-[#ffdea5] px-4 py-2 text-center">
          <span className="block font-speaker-name text-2xl font-black text-[#775a19]">
            {record.grade}
          </span>
          <span className="font-ui-label text-[10px] font-bold text-[#04162e]">{record.score}점</span>
        </div>
      </div>
      <div className="rounded-r-lg border-l-4 border-[#ba1a1a] bg-[#fed488]/30 p-3.5">
        <span className="block font-speaker-name text-xs font-bold text-[#ba1a1a]">교수 첨삭 총평</span>
        <p className="mt-1 font-dialogue-text text-sm italic text-[#1f1b14]">
          {record.summaryFeedback}
        </p>
      </div>
      <div className="whitespace-pre-line rounded-lg bg-[#f6ede0]/60 p-3 font-dialogue-text text-sm leading-relaxed text-[#1f1b14]">
        {record.content}
      </div>
      {record.annotations.length > 0 && (
        <div className="space-y-2">
          <span className="font-ui-label text-xs font-bold uppercase tracking-wide text-[#775a19]">
            붉은 잉크 세부 교정
          </span>
          {record.annotations.map((annotation, index) => (
            <div
              key={`${annotation.text}-${index}`}
              className="flex items-start gap-2 rounded border border-[#e9c176] bg-white p-2.5 text-xs"
            >
              <span className="material-symbols-outlined mt-0.5 text-sm text-[#ba1a1a]">edit_note</span>
              <div>
                <span className="font-bold text-[#04162e]">“{annotation.text}”</span>
                <span className="ml-1 text-[#ba1a1a]">→ {annotation.note}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setSelectedRecord(null)}
        className="flex items-center gap-1 font-ui-label text-xs font-bold text-[#775a19] hover:underline"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        목록으로 돌아가기
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        aria-label="과제 첨삭 모달 닫기"
        className="absolute inset-0 bg-[#04162e]/75 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-review-title"
        className="glass-panel-light relative z-10 my-auto flex max-h-[92vh] w-full max-w-5xl flex-col gap-5 overflow-y-auto rounded-2xl p-5 shadow-2xl sm:p-8 custom-scrollbar"
      >
        <div className="gold-filigree filigree-tl" />
        <div className="gold-filigree filigree-tr" />
        <div className="gold-filigree filigree-bl" />
        <div className="gold-filigree filigree-br" />

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-[#775a19] transition-colors hover:bg-black/5 hover:text-[#04162e]"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="flex flex-col gap-3 border-b border-[#775a19]/30 pb-4 pr-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#ffdea5]">
              <img src={professor.avatarUrl} alt={professor.name} className="h-full w-full object-cover" />
            </div>
            <div>
              <h3 id="assignment-review-title" className="font-speaker-name text-2xl font-bold text-[#04162e]">
                과제 첨삭실 (Assignment Evaluation)
              </h3>
              <p className="font-dialogue-text text-sm italic text-[#44474d]">
                지도 교수: <span className="font-bold text-[#775a19]">{professor.name}</span> ({professor.field})
              </p>
            </div>
          </div>
          {renderHealth()}
        </div>

        {health.status === 'offline' && (
          <div className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-red-50 p-3 font-ui-label text-sm text-[#7f1d1d]">
            <span className="material-symbols-outlined text-xl">error</span>
            <span>{health.message}</span>
          </div>
        )}

        <div className="flex gap-2 border-b border-[#c5c6ce]">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('submit');
              setSelectedRecord(null);
            }}
            className={`border-b-2 px-4 py-2 font-button-text text-sm font-bold transition-all ${
              activeTab === 'submit'
                ? 'border-[#775a19] text-[#775a19]'
                : 'border-transparent text-[#75777e] hover:text-[#04162e]'
            }`}
          >
            새 과제 첨삭
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setActiveTab('history');
              setSelectedRecord(null);
            }}
            className={`border-b-2 px-4 py-2 font-button-text text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'border-[#775a19] text-[#775a19]'
                : 'border-transparent text-[#75777e] hover:text-[#04162e]'
            }`}
          >
            첨삭 기록 ({assignments.length})
          </button>
        </div>

        {activeTab === 'submit' && grading.status === 'success' && (
          <AssignmentFeedbackResult
            report={grading.report}
            recordTitle={title.trim()}
            saveWarning={saveWarning}
            onNew={resetForm}
            onBack={() => {
              setActiveTab('history');
              setSelectedRecord(null);
            }}
          />
        )}

        {activeTab === 'submit' && grading.status !== 'success' && (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            {grading.status === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/30 bg-red-50 p-3 font-ui-label text-sm text-[#7f1d1d]">
                <span className="material-symbols-outlined text-xl">error</span>
                <div className="flex-1 whitespace-pre-line">
                  <strong className="block">첨삭 요청을 완료하지 못했습니다.</strong>
                  {grading.message}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="assignment-record-title" className="font-ui-label text-xs font-bold uppercase tracking-wider text-[#04162e]">
                기록 제목
              </label>
              <input
                id="assignment-record-title"
                type="text"
                value={title}
                maxLength={120}
                disabled={grading.status === 'submitting'}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setErrors((previous) => ({ ...previous, title: undefined }));
                }}
                placeholder="예: 중간고사 대체 리포트 초안"
                className={`mt-1 w-full rounded-lg border bg-white px-3.5 py-2.5 font-speaker-name text-base text-[#04162e] outline-none disabled:opacity-60 ${
                  errors.title ? 'border-[#ba1a1a]' : 'border-[#c5c6ce] focus:border-[#775a19]'
                }`}
              />
              <div className="mt-1 flex justify-between gap-3">
                <span className="font-ui-label text-xs text-[#ba1a1a]">{errors.title || ''}</span>
                <span className="font-ui-label text-[11px] text-[#75777e]">{title.length} / 120자</span>
              </div>
            </div>

            <AssignmentSourceInput
              id="lecture-source"
              label="1. 강의 요약본"
              description="평가 기준이 되는 강의 핵심 내용을 입력합니다."
              value={lecture}
              minLength={SOURCE_LIMITS.lecture.min}
              maxLength={SOURCE_LIMITS.lecture.max}
              disabled={grading.status === 'submitting'}
              error={errors.lecture}
              onChange={(value) => updateSource('lecture', value)}
              onError={(message) => setErrors((previous) => ({ ...previous, lecture: message || undefined }))}
            />

            <AssignmentSourceInput
              id="assignment-source"
              label="2. 교수 과제 지시문"
              description="분량, 필수 개념, 제출 형식 등 과제 요구사항을 입력합니다."
              value={assignment}
              minLength={SOURCE_LIMITS.assignment.min}
              maxLength={SOURCE_LIMITS.assignment.max}
              disabled={grading.status === 'submitting'}
              error={errors.assignment}
              onChange={(value) => updateSource('assignment', value)}
              onError={(message) => setErrors((previous) => ({ ...previous, assignment: message || undefined }))}
            />

            <AssignmentSourceInput
              id="submission-source"
              label="3. 학생 제출물"
              description="실제로 평가할 학생의 답안이나 리포트를 입력합니다."
              value={submission}
              minLength={SOURCE_LIMITS.submission.min}
              maxLength={SOURCE_LIMITS.submission.max}
              rows={7}
              disabled={grading.status === 'submitting'}
              error={errors.submission}
              onChange={(value) => updateSource('submission', value)}
              onError={(message) => setErrors((previous) => ({ ...previous, submission: message || undefined }))}
            />

            <div className="flex flex-col gap-2 border-t border-[#c5c6ce] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-dialogue-text text-xs italic text-[#75777e]">
                자동 첨삭은 교수자의 최종 판단을 보조하는 자료입니다.
              </p>
              <button
                type="submit"
                disabled={grading.status === 'submitting' || health.status !== 'online'}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#775a19] px-6 py-3 font-button-text text-sm font-bold text-white shadow-md transition-all hover:bg-[#04162e] hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {grading.status === 'submitting' ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    강의 내용과 과제 요구사항을 비교해 첨삭 중...
                  </>
                ) : health.status === 'offline' ? (
                  <>
                    <span className="material-symbols-outlined text-lg">cloud_off</span>
                    서버 연결 필요
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">border_color</span>
                    실제 첨삭 요청하기
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <p className="py-10 text-center font-dialogue-text italic text-[#75777e]">
                아직 제출된 과제 첨삭 기록이 없습니다.
              </p>
            ) : selectedRecord ? (
              selectedRecord.feedbackReport ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-ui-label text-xs font-bold text-[#775a19]">
                      {selectedRecord.timestamp} · {selectedRecord.topic}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(null)}
                      className="flex items-center gap-1 font-ui-label text-xs font-bold text-[#775a19] hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      목록으로
                    </button>
                  </div>
                  {selectedRecord.inputSnapshots && (
                    <details className="rounded-xl border border-[#c5c6ce] bg-white p-4">
                      <summary className="cursor-pointer font-speaker-name text-sm font-bold text-[#04162e]">
                        제출 당시 입력 자료
                      </summary>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {renderInputSnapshot('강의 요약본', selectedRecord.inputSnapshots.lecture)}
                        {renderInputSnapshot('교수 과제 지시문', selectedRecord.inputSnapshots.assignment)}
                        {renderInputSnapshot('학생 제출물', selectedRecord.inputSnapshots.submission)}
                      </div>
                    </details>
                  )}
                  <AssignmentFeedbackResult
                    report={selectedRecord.feedbackReport}
                    recordTitle={selectedRecord.title}
                    onBack={() => setSelectedRecord(null)}
                    onNew={resetForm}
                  />
                </div>
              ) : (
                renderLegacyRecord(selectedRecord)
              )
            ) : (
              <div className="space-y-3">
                {assignments.map((record) => (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => {
                      soundManager.playPageTurn();
                      setSelectedRecord(record);
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#c5c6ce] bg-[#fff8f2] p-4 text-left shadow-sm transition-all hover:border-[#775a19] hover:bg-[#f6ede0]"
                  >
                    <div className="min-w-0">
                      <span className="font-ui-label text-[11px] font-semibold text-[#775a19]">
                        {record.topic} • {record.timestamp}
                      </span>
                      <h4 className="mt-0.5 truncate font-speaker-name text-base font-bold text-[#04162e]">
                        {record.title}
                      </h4>
                      <p className="mt-1 line-clamp-1 font-dialogue-text text-xs italic text-[#75777e]">
                        “{record.summaryFeedback}”
                      </p>
                      {record.feedbackReport && (
                        <span className="mt-1 inline-block rounded-full bg-[#eae1d5] px-2 py-0.5 font-ui-label text-[10px] font-bold text-[#44474d]">
                          {record.feedbackReport.engine}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="font-speaker-name text-xl font-bold text-[#775a19]">{record.grade}</span>
                      <span className="material-symbols-outlined text-lg text-[#75777e]">chevron_right</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
