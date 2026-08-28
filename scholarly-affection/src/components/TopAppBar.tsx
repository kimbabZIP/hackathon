import React from 'react';
import { Professor } from '../types';
import { soundManager } from '../utils/audio';

interface TopAppBarProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  activeProfessor?: Professor | null;
  onSelectProfessor?: () => void;
  onOpenLibrary?: () => void;
  onToggleSound?: () => void;
  soundEnabled?: boolean;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title = 'Scholarly Affection',
  onBack,
  showBack = false,
  activeProfessor,
  onSelectProfessor,
  onOpenLibrary,
  onToggleSound,
  soundEnabled = true,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-12 h-20 border-b border-[#ffdea5]/30 bg-[#04162e]/85 backdrop-blur-md shadow-sm transition-all">
      <div className="flex items-center gap-4 text-[#ffdea5]">
        {showBack && (
          <button
            onClick={() => {
              soundManager.playClick();
              onBack?.();
            }}
            aria-label="Back"
            className="hover:text-[#e9c176] transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
        )}
        <h1 className="font-speaker-name text-2xl md:text-3xl text-[#ffdea5] italic tracking-wide">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4 md:gap-6 text-[#b6c7e7]">
        {onToggleSound && (
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleSound();
            }}
            title={soundEnabled ? '음소거' : '음소거 해제'}
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
          </button>
        )}

        {onOpenLibrary && (
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenLibrary();
            }}
            title="자료실 / 갤러리"
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">menu_book</span>
          </button>
        )}

        {onSelectProfessor && (
          <button
            onClick={() => {
              soundManager.playClick();
              onSelectProfessor();
            }}
            title="지도 교수 변경"
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">school</span>
          </button>
        )}

        {activeProfessor && (
          <div
            onClick={() => {
              soundManager.playClick();
              onSelectProfessor?.();
            }}
            title={`${activeProfessor.name} (${activeProfessor.field})`}
            className="w-10 h-10 rounded-full border-2 border-[#ffdea5] overflow-hidden bg-[#f6ede0] cursor-pointer hover:scale-105 transition-transform shadow-md"
          >
            <img
              src={activeProfessor.avatarUrl}
              alt={activeProfessor.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </header>
  );
};
