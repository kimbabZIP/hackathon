import React from 'react';
import { Professor } from '../types';
import { soundManager } from '../utils/audio';

interface ProfessorSelectModalProps {
  professors: Professor[];
  selectedProfessorId: string;
  onSelectProfessor: (prof: Professor) => void;
  onCreateNewProfessor: () => void;
  onClose?: () => void;
}

export const ProfessorSelectModal: React.FC<ProfessorSelectModalProps> = ({
  professors,
  selectedProfessorId,
  onSelectProfessor,
  onCreateNewProfessor,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#04162e]/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div
        aria-modal="true"
        role="dialog"
        className="relative z-10 glass-panel-light w-full max-w-2xl rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Decorative Gold Corners */}
        <div className="gold-filigree filigree-tl"></div>
        <div className="gold-filigree filigree-tr"></div>
        <div className="gold-filigree filigree-bl"></div>
        <div className="gold-filigree filigree-br"></div>

        {/* Close Button if applicable */}
        {onClose && (
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 text-[#775a19] hover:text-[#04162e] p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center border-b border-[#775a19]/30 pb-4 pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#ffdea5]/40 text-[#775a19] mb-2">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <h3 className="font-speaker-name text-2xl sm:text-3xl text-[#04162e] font-bold">
            지도 교수 선택
          </h3>
          <p className="font-dialogue-text text-[#44474d] text-sm sm:text-base mt-1.5 italic">
            연구를 함께할 지도 교수를 선택해주십시오.
          </p>
        </div>

        {/* Professor List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {professors.map((prof) => {
            const isSelected = prof.id === selectedProfessorId;
            return (
              <button
                key={prof.id}
                onClick={() => {
                  soundManager.playPageTurn();
                  onSelectProfessor(prof);
                }}
                className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left w-full relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-[#775a19] bg-[#f6ede0] shadow-md ring-2 ring-[#775a19]/30'
                    : 'border-[#c5c6ce] hover:border-[#775a19] hover:bg-[#f0e7da] bg-[#fff8f2]'
                }`}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#ffdea5] flex-shrink-0 relative shadow-sm group-hover:scale-105 transition-transform">
                  <img
                    src={prof.avatarUrl}
                    alt={prof.name}
                    className="w-full h-full object-cover"
                  />
                  {prof.customCreated && (
                    <span className="absolute bottom-0 right-0 bg-[#775a19] text-white text-[9px] px-1 rounded-full">
                      Custom
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-speaker-name text-base sm:text-lg font-bold text-[#04162e] group-hover:text-[#775a19] transition-colors truncate">
                    {prof.name}
                  </h4>
                  <p className="font-ui-label text-[#775a19] font-medium text-xs tracking-wide truncate">
                    {prof.field}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#75777e]">
                    <span>호감도 {prof.affection}%</span>
                    <span>•</span>
                    <span>스트레스 {prof.stress}%</span>
                  </div>
                </div>

                <span className="material-symbols-outlined text-[#775a19] opacity-0 group-hover:opacity-100 transition-opacity pr-1 text-lg">
                  arrow_forward_ios
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-[#775a19]/30 flex justify-center">
          <button
            onClick={() => {
              soundManager.playClick();
              onCreateNewProfessor();
            }}
            className="flex items-center gap-2 bg-[#f6ede0] hover:bg-[#ffdea5] text-[#04162e] border border-[#775a19] px-6 py-3 rounded-full font-button-text font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-[#775a19]">person_add</span>
            <span>+ 새로운 교수 임명하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
