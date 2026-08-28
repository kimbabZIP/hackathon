import React from 'react';
import { SaveSlot } from '../types';
import { soundManager } from '../utils/audio';

interface SaveLoadModalProps {
  mode: 'save' | 'load';
  slots: SaveSlot[];
  onSaveToSlot: (slotId: number) => void;
  onLoadFromSlot: (slot: SaveSlot) => void;
  onClose: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  mode,
  slots,
  onSaveToSlot,
  onLoadFromSlot,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[#04162e]/75 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative z-10 glass-panel-light w-full max-w-2xl rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="gold-filigree filigree-tl"></div>
        <div className="gold-filigree filigree-tr"></div>
        <div className="gold-filigree filigree-bl"></div>
        <div className="gold-filigree filigree-br"></div>

        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-[#775a19] hover:text-[#04162e] p-1 rounded-full hover:bg-black/5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Header */}
        <div className="text-center border-b border-[#775a19]/30 pb-3">
          <h3 className="font-speaker-name text-2xl font-bold text-[#04162e]">
            {mode === 'save' ? '연구 기록 저장 (Save Record)' : '연구 기록 불러오기 (Load Record)'}
          </h3>
          <p className="font-dialogue-text text-sm text-[#44474d] italic mt-1">
            원하는 슬롯을 선택하여 학문적 여정을 기록하고 이어가십시오.
          </p>
        </div>

        {/* Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
          {slots.map((slot) => {
            return (
              <div
                key={slot.slotId}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  slot.isEmpty
                    ? 'border-dashed border-[#c5c6ce] bg-[#fff8f2]/60'
                    : 'border-[#775a19] bg-[#fff8f2] shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-ui-label text-xs font-bold text-[#775a19] uppercase tracking-wider">
                    Slot {slot.slotId + 1}
                  </span>
                  {slot.timestamp && (
                    <span className="font-ui-label text-[11px] text-[#75777e]">
                      {slot.timestamp}
                    </span>
                  )}
                </div>

                {slot.isEmpty ? (
                  <div className="py-6 text-center text-[#75777e] font-dialogue-text italic text-sm">
                    빈 연구 기록 슬롯
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {slot.avatarUrl && (
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#ffdea5] flex-shrink-0">
                          <img src={slot.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-speaker-name font-bold text-sm text-[#04162e]">
                          {slot.professorName}
                        </h4>
                        <div className="text-[11px] text-[#775a19]">
                          호감도 {slot.affection}% • 스트레스 {slot.stress}%
                        </div>
                      </div>
                    </div>
                    {slot.snippet && (
                      <p className="font-dialogue-text text-xs text-[#44474d] line-clamp-2 bg-[#f6ede0]/60 p-2 rounded italic">
                        "{slot.snippet}"
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-1">
                  {mode === 'save' ? (
                    <button
                      onClick={() => {
                        soundManager.playPenWrite();
                        onSaveToSlot(slot.slotId);
                      }}
                      className="px-4 py-1.5 bg-[#775a19] hover:bg-[#04162e] text-white rounded-lg font-button-text text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      {slot.isEmpty ? '새로 저장' : '덮어쓰기'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!slot.isEmpty) {
                          soundManager.playPageTurn();
                          onLoadFromSlot(slot);
                        }
                      }}
                      disabled={slot.isEmpty}
                      className="px-4 py-1.5 bg-[#f6ede0] hover:bg-[#ffdea5] text-[#04162e] border border-[#775a19] rounded-lg font-button-text text-xs font-bold transition-all active:scale-95 disabled:opacity-30 cursor-pointer shadow-sm"
                    >
                      불러오기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
