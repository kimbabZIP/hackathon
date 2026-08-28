import React from 'react';
import { AssignmentFeedbackReport } from '../types';
import { soundManager } from '../utils/audio';

interface AssignmentFeedbackResultProps {
  report: AssignmentFeedbackReport;
  recordTitle?: string;
  saveWarning?: string | null;
  onNew?: () => void;
  onBack?: () => void;
}

const ResultList: React.FC<{
  title: string;
  icon: string;
  items: string[];
  tone?: 'gold' | 'navy' | 'red';
  emptyText: string;
}> = ({ title, icon, items, tone = 'gold', emptyText }) => {
  const colors = {
    gold: 'border-[#e9c176] bg-[#fed488]/15 text-[#775a19]',
    navy: 'border-[#b6c7e7] bg-[#d5e3ff]/20 text-[#04162e]',
    red: 'border-[#ba1a1a]/30 bg-red-50/70 text-[#ba1a1a]',
  };

  return (
    <section className={`rounded-xl border p-4 ${colors[tone]}`}>
      <h5 className="flex items-center gap-2 font-speaker-name text-base font-bold">
        <span className="material-symbols-outlined text-xl">{icon}</span>
        {title}
      </h5>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5 pl-5 font-dialogue-text text-sm text-[#1f1b14]">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="list-disc leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 font-dialogue-text text-sm italic text-[#75777e]">{emptyText}</p>
      )}
    </section>
  );
};

export const AssignmentFeedbackResult: React.FC<AssignmentFeedbackResultProps> = ({
  report,
  recordTitle,
  saveWarning,
  onNew,
  onBack,
}) => {
  const isGemini = report.engine.toLowerCase().includes('gemini');

  return (
    <div className="space-y-5">
      {recordTitle && (
        <div className="border-b border-[#c5c6ce] pb-3">
          <span className="font-ui-label text-xs font-bold uppercase tracking-wider text-[#775a19]">
            저장된 첨삭 기록
          </span>
          <h4 className="mt-1 font-speaker-name text-xl font-bold text-[#04162e]">
            {recordTitle}
          </h4>
        </div>
      )}

      <section className="rounded-2xl border border-[#775a19] bg-[#fff8f2] p-5 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-ui-label text-xs font-bold ${
                isGemini
                  ? 'bg-[#d5e3ff] text-[#04162e]'
                  : 'bg-[#ffdea5] text-[#775a19]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isGemini ? 'auto_awesome' : 'rule'}
              </span>
              {report.engine}
            </div>
            <h4 className="mt-2 font-speaker-name text-2xl font-bold text-[#04162e]">
              {report.title}
            </h4>
          </div>
          <div className="flex items-center gap-3 self-start rounded-xl border border-[#775a19] bg-[#ffdea5] px-5 py-3 text-[#775a19] shadow-sm">
            <span className="font-speaker-name text-3xl font-black">{report.grade}</span>
            <div className="h-9 w-px bg-[#775a19]/30" />
            <div>
              <span className="block font-speaker-name text-2xl font-black leading-none">
                {report.total_score}
              </span>
              <span className="font-ui-label text-[10px] font-bold">/ 100점</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border-l-4 border-[#ba1a1a] bg-[#fed488]/25 p-4">
          <span className="font-speaker-name text-xs font-bold text-[#ba1a1a]">교수 첨삭 총평</span>
          <p className="mt-1 font-dialogue-text text-sm leading-relaxed text-[#1f1b14]">
            {report.summary}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-[#c5c6ce] bg-white p-4">
        <h5 className="font-speaker-name text-lg font-bold text-[#04162e]">평가 기준별 결과</h5>
        <div className="mt-3 space-y-4">
          {report.criteria.map((criterion, index) => {
            const percentage = Math.max(
              0,
              Math.min(100, (criterion.score / criterion.max_score) * 100),
            );
            return (
              <div key={`${criterion.name}-${index}`}>
                <div className="flex items-center justify-between gap-3 font-ui-label text-sm">
                  <span className="font-bold text-[#04162e]">{criterion.name}</span>
                  <span className="font-bold text-[#775a19]">
                    {criterion.score} / {criterion.max_score}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eae1d5]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#775a19] to-[#fed488] transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-1.5 font-dialogue-text text-xs leading-relaxed text-[#44474d]">
                  {criterion.evidence || criterion.feedback}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ResultList
          title="잘한 점"
          icon="verified"
          items={report.strengths}
          tone="gold"
          emptyText="명시적으로 추출된 강점이 없습니다."
        />
        <ResultList
          title="우선 개선할 점"
          icon="priority_high"
          items={report.priorities}
          tone="navy"
          emptyText="추가 개선 우선순위가 없습니다."
        />
      </div>

      {report.misconceptions.length > 0 && (
        <ResultList
          title="확인된 오개념"
          icon="warning"
          items={report.misconceptions}
          tone="red"
          emptyText="확인된 오개념이 없습니다."
        />
      )}

      <section className="rounded-xl border border-[#c5c6ce] bg-[#fff8f2] p-4">
        <h5 className="flex items-center gap-2 font-speaker-name text-lg font-bold text-[#04162e]">
          <span className="material-symbols-outlined text-[#ba1a1a]">edit_note</span>
          문장별 교정
        </h5>
        {report.line_edits.length > 0 ? (
          <div className="mt-3 space-y-3">
            {report.line_edits.map((edit, index) => (
              <div key={`${edit.original}-${index}`} className="rounded-xl border border-[#e9c176] bg-white p-3.5">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_1fr] md:items-start">
                  <p className="rounded-lg bg-red-50 p-2.5 font-dialogue-text text-sm text-[#7f1d1d] line-through decoration-[#ba1a1a]/50">
                    {edit.original}
                  </p>
                  <span className="material-symbols-outlined hidden pt-2 text-[#775a19] md:block">
                    arrow_forward
                  </span>
                  <p className="rounded-lg bg-emerald-50 p-2.5 font-dialogue-text text-sm text-emerald-900">
                    {edit.revised}
                  </p>
                </div>
                <p className="mt-2 font-ui-label text-xs text-[#75777e]">수정 이유: {edit.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 font-dialogue-text text-sm italic text-[#75777e]">
            직접 수정할 문장이 발견되지 않았습니다.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[#775a19] bg-[#f6ede0] p-4 shadow-inner">
        <h5 className="flex items-center gap-2 font-speaker-name text-lg font-bold text-[#04162e]">
          <span className="material-symbols-outlined text-[#775a19]">auto_fix_high</span>
          개선된 답안 예시
        </h5>
        <p className="mt-2 whitespace-pre-line font-dialogue-text text-sm leading-relaxed text-[#1f1b14]">
          {report.improved_example}
        </p>
      </section>

      {saveWarning && (
        <div className="flex items-start gap-2 rounded-xl border border-[#ba1a1a]/40 bg-red-50 p-3 font-ui-label text-sm text-[#7f1d1d]">
          <span className="material-symbols-outlined text-xl">save_off</span>
          <span>{saveWarning}</span>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-[#c5c6ce] bg-[#eae1d5]/50 p-3 font-ui-label text-xs leading-relaxed text-[#44474d]">
        <span className="material-symbols-outlined text-base text-[#775a19]">info</span>
        <span>{report.caution}</span>
      </div>

      {(onNew || onBack) && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#c5c6ce] pt-4">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onBack();
              }}
              className="rounded-xl border border-[#775a19] bg-[#fff8f2] px-5 py-2.5 font-button-text text-sm font-bold text-[#04162e] transition-colors hover:bg-[#ffdea5]"
            >
              기록 목록으로
            </button>
          )}
          {onNew && (
            <button
              type="button"
              onClick={() => {
                soundManager.playPageTurn();
                onNew();
              }}
              className="rounded-xl bg-[#775a19] px-5 py-2.5 font-button-text text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#04162e]"
            >
              새 과제 첨삭
            </button>
          )}
        </div>
      )}
    </div>
  );
};
