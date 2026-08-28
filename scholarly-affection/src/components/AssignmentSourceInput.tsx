import React, { useRef, useState } from 'react';
import { AssignmentSourceInput as AssignmentSourceInputValue } from '../types';
import {
  ASSIGNMENT_FILE_ACCEPT,
  ASSIGNMENT_MAX_FILE_BYTES,
} from '../services/assignmentFeedback';
import { soundManager } from '../utils/audio';

interface AssignmentSourceInputProps {
  id: string;
  label: string;
  description: string;
  value: AssignmentSourceInputValue;
  minLength: number;
  maxLength: number;
  rows?: number;
  disabled?: boolean;
  error?: string;
  onChange: (value: AssignmentSourceInputValue) => void;
  onError: (message: string | null) => void;
}

const ALLOWED_EXTENSIONS = new Set(['txt', 'md', 'pdf', 'docx']);

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AssignmentSourceInput: React.FC<AssignmentSourceInputProps> = ({
  id,
  label,
  description,
  value,
  minLength,
  maxLength,
  rows = 5,
  disabled = false,
  error,
  onChange,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const changeMode = (mode: AssignmentSourceInputValue['mode']) => {
    if (disabled || value.mode === mode) return;
    soundManager.playClick();
    onError(null);
    onChange({ mode, text: '', file: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectFile = (file: File | null) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      onError('TXT, MD, PDF, DOCX 파일만 업로드할 수 있습니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size === 0) {
      onError('빈 파일은 업로드할 수 없습니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > ASSIGNMENT_MAX_FILE_BYTES) {
      onError('파일은 12MB 이하여야 합니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    soundManager.playPenWrite();
    onError(null);
    onChange({ mode: 'file', text: '', file });
  };

  const removeFile = () => {
    soundManager.playClick();
    onError(null);
    onChange({ mode: 'file', text: '', file: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="rounded-xl border border-[#c5c6ce] bg-[#fff8f2] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label
            htmlFor={`${id}-${value.mode}`}
            className="font-speaker-name text-base font-bold text-[#04162e]"
          >
            {label}
          </label>
          <p className="mt-0.5 font-dialogue-text text-xs text-[#75777e]">{description}</p>
        </div>

        <div className="inline-flex self-start rounded-lg border border-[#c5c6ce] bg-[#f6ede0] p-0.5">
          <button
            type="button"
            onClick={() => changeMode('text')}
            disabled={disabled}
            className={`rounded-md px-3 py-1.5 font-ui-label text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              value.mode === 'text'
                ? 'bg-[#775a19] text-white shadow-sm'
                : 'text-[#44474d] hover:bg-[#eae1d5]'
            }`}
          >
            텍스트
          </button>
          <button
            type="button"
            onClick={() => changeMode('file')}
            disabled={disabled}
            className={`rounded-md px-3 py-1.5 font-ui-label text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              value.mode === 'file'
                ? 'bg-[#775a19] text-white shadow-sm'
                : 'text-[#44474d] hover:bg-[#eae1d5]'
            }`}
          >
            파일
          </button>
        </div>
      </div>

      {value.mode === 'text' ? (
        <div className="mt-3">
          <textarea
            id={`${id}-text`}
            rows={rows}
            value={value.text}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(event) => {
              onError(null);
              onChange({ mode: 'text', text: event.target.value, file: null });
            }}
            placeholder={`${minLength}자 이상 입력해 주세요.`}
            className={`w-full resize-y rounded-lg border bg-white px-3.5 py-3 font-dialogue-text text-sm leading-relaxed text-[#1f1b14] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              error
                ? 'border-[#ba1a1a] focus:border-[#ba1a1a]'
                : 'border-[#c5c6ce] focus:border-[#775a19]'
            }`}
          />
          <div className="mt-1 flex items-start justify-between gap-3">
            <span className="font-ui-label text-xs text-[#ba1a1a]">{error || ''}</span>
            <span className="flex-shrink-0 font-ui-label text-[11px] text-[#75777e]">
              {value.text.length.toLocaleString()} / {maxLength.toLocaleString()}자
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <input
            id={`${id}-file`}
            ref={fileInputRef}
            type="file"
            accept={ASSIGNMENT_FILE_ACCEPT}
            disabled={disabled}
            onChange={(event) => selectFile(event.target.files?.[0] || null)}
            className="hidden"
          />
          {value.file ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#775a19] bg-[#fed488]/20 p-3">
              <span className="material-symbols-outlined text-2xl text-[#775a19]">description</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-ui-label text-sm font-bold text-[#04162e]">
                  {value.file.name}
                </p>
                <p className="font-ui-label text-xs text-[#75777e]">
                  {formatBytes(value.file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                disabled={disabled}
                aria-label={`${label} 파일 제거`}
                className="rounded-full p-1.5 text-[#ba1a1a] transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              id={`${id}-file-dropzone`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                if (!disabled) selectFile(event.dataTransfer.files?.[0] || null);
              }}
              disabled={disabled}
              className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                error
                  ? 'border-[#ba1a1a] bg-red-50/40'
                  : isDragging
                    ? 'border-[#775a19] bg-[#ffdea5]/30'
                    : 'border-[#c5c6ce] bg-[#f6ede0]/50 hover:border-[#775a19] hover:bg-[#f6ede0]'
              }`}
            >
              <span className="material-symbols-outlined mb-1 text-3xl text-[#775a19]">
                upload_file
              </span>
              <span className="font-dialogue-text text-sm text-[#1f1b14]">
                파일을 끌어놓거나 클릭하여 선택
              </span>
              <span className="mt-1 font-ui-label text-[11px] text-[#75777e]">
                TXT, MD, PDF, DOCX · 파일당 최대 12MB
              </span>
            </button>
          )}
          {error && <p className="mt-1 font-ui-label text-xs text-[#ba1a1a]">{error}</p>}
        </div>
      )}
    </section>
  );
};
