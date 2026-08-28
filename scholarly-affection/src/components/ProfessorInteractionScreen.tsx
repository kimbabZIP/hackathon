import React from 'react';
import { Professor } from '../types';
import { TopAppBar } from './TopAppBar';
import { soundManager } from '../utils/audio';

interface ProfessorInteractionScreenProps {
  professor: Professor;
  onBackToTitle: () => void;
  onOpenSelectProfessor: () => void;
  onStartDialogue: () => void;
  onOpenAssignment: () => void;
  onOpenLectureMaterials: () => void;
  onOpenLectureVoice: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
}

export const ProfessorInteractionScreen: React.FC<ProfessorInteractionScreenProps> = ({
  professor,
  onBackToTitle,
  onOpenSelectProfessor,
  onStartDialogue,
  onOpenAssignment,
  onOpenLectureMaterials,
  onOpenLectureVoice,
  onOpenGallery,
  onOpenSettings,
  onToggleSound,
  soundEnabled,
}) => {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col font-dialogue-text text-[#1f1b14] select-none">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${professor.bgUrl}')` }}
        ></div>
        <div className="absolute inset-0 bg-[#04162e]/25 backdrop-blur-[1px]"></div>
      </div>

      {/* Top App Bar */}
      <TopAppBar
        title="Scholarly Affection"
        showBack={true}
        onBack={onBackToTitle}
        activeProfessor={professor}
        onSelectProfessor={onOpenSelectProfessor}
        onOpenLibrary={onOpenGallery}
        onToggleSound={onToggleSound}
        soundEnabled={soundEnabled}
      />

      {/* Main Content Grid */}
      <main className="relative z-10 flex-grow flex flex-col md:flex-row pt-20 pb-20 md:pb-0 h-screen max-h-screen">
        {/* Left Column: Actions & Status (Glassmorphism Panel) */}
        <div className="w-full md:w-[420px] flex-shrink-0 flex flex-col h-full p-4 sm:p-6 md:p-8 justify-between relative z-20 pointer-events-auto overflow-y-auto custom-scrollbar">
          {/* Top Status Section (Ink Wells) */}
          <div className="glass-panel-status p-5 sm:p-6 rounded-2xl shadow-xl mt-2 flex flex-col gap-4 border border-[#e9c176]">
            <div className="flex items-center justify-between border-b border-[#c5c6ce]/60 pb-3">
              <div>
                <h2 className="font-speaker-name text-xl sm:text-2xl font-bold text-[#04162e]">
                  {professor.name}
                </h2>
                <p className="font-ui-label text-xs text-[#775a19] font-medium tracking-wide">
                  {professor.field} • {professor.title}
                </p>
              </div>
              <span className="material-symbols-outlined text-[#775a19] text-2xl">history_edu</span>
            </div>

            {/* Inkwells */}
            <div className="flex gap-8 justify-center py-1">
              {/* Affection Inkwell */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-12 h-32 ink-bar-container shadow-inner">
                  <div className="absolute top-0 w-full h-3.5 bg-[#ffdea5] z-10 rounded-t-full opacity-90 border-b border-[#775a19]"></div>
                  <div
                    className="ink-bar-fill bg-gradient-to-t from-[#775a19] to-[#fed488] transition-all duration-700 ease-out"
                    style={{ height: `${Math.min(100, Math.max(5, professor.affection))}%` }}
                  ></div>
                  <div className="absolute bottom-0 w-full h-3.5 bg-[#ffdea5] z-10 rounded-b-full opacity-90 border-t border-[#775a19]"></div>
                  {/* Glass glare */}
                  <div className="absolute inset-y-2 right-1.5 w-2 rounded-full bg-white/40 backdrop-blur-sm z-20 pointer-events-none"></div>
                </div>
                <div className="text-center">
                  <span className="font-ui-label text-xs font-bold text-[#44474d] uppercase tracking-widest block">
                    Affection
                  </span>
                  <span className="font-speaker-name text-sm font-bold text-[#775a19]">
                    {professor.affection}%
                  </span>
                </div>
              </div>

              {/* Stress Inkwell */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-12 h-32 ink-bar-container shadow-inner">
                  <div className="absolute top-0 w-full h-3.5 bg-[#ffdea5] z-10 rounded-t-full opacity-90 border-b border-[#775a19]"></div>
                  <div
                    className="ink-bar-fill bg-gradient-to-t from-[#04162e] to-[#1a2b44] transition-all duration-700 ease-out"
                    style={{ height: `${Math.min(100, Math.max(5, professor.stress))}%` }}
                  ></div>
                  <div className="absolute bottom-0 w-full h-3.5 bg-[#ffdea5] z-10 rounded-b-full opacity-90 border-t border-[#775a19]"></div>
                  {/* Glass glare */}
                  <div className="absolute inset-y-2 right-1.5 w-2 rounded-full bg-white/40 backdrop-blur-sm z-20 pointer-events-none"></div>
                </div>
                <div className="text-center">
                  <span className="font-ui-label text-xs font-bold text-[#44474d] uppercase tracking-widest block">
                    Stress
                  </span>
                  <span className="font-speaker-name text-sm font-bold text-[#04162e]">
                    {professor.stress}%
                  </span>
                </div>
              </div>
            </div>

            <p className="font-dialogue-text text-xs text-[#44474d] italic bg-[#fff8f2]/60 p-2.5 rounded-lg border border-[#e9c176]/40 line-clamp-2">
              "{professor.traits}"
            </p>
          </div>

          {/* Middle: Action Buttons (The Vertical Menu) */}
          <div className="flex flex-col gap-2.5 my-4">
            {/* Start Dialogue Button */}
            <button
              onClick={() => {
                soundManager.playPageTurn();
                onStartDialogue();
              }}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#eae1d5] to-[#f6ede0] p-3.5 shadow-md border border-[#775a19] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:from-[#fed488] hover:to-[#ffdea5] active:scale-98 text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#04162e] text-[#ffdea5] flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-xl">forum</span>
                </div>
                <div>
                  <span className="font-button-text font-bold text-sm text-[#04162e] block">
                    연구실 대화하기
                  </span>
                  <span className="font-ui-label text-[11px] text-[#775a19]">
                    교수와 지적인 대화 및 교감 시작
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#775a19] group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </button>

            {/* Grade Assignment Button */}
            <button
              onClick={() => {
                soundManager.playPenWrite();
                onOpenAssignment();
              }}
              className="group relative w-full overflow-hidden rounded-xl bg-[#f0e7da] p-3.5 shadow-sm border border-[#c5c6ce] hover:border-[#775a19] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#fed488]/40 active:scale-98 text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#fff8f2] flex items-center justify-center border border-[#c5c6ce] group-hover:border-[#775a19] shadow-sm">
                  <span className="material-symbols-outlined text-[#04162e]">
                    assignment_turned_in
                  </span>
                </div>
                <div>
                  <span className="font-button-text font-bold text-sm text-[#1f1b14] block">
                    과제 첨삭하기
                  </span>
                  <span className="font-ui-label text-[11px] text-[#75777e]">
                    리포트 제출 및 만년필 첨삭 평가
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#75777e] group-hover:text-[#775a19] transition-colors">
                chevron_right
              </span>
            </button>

            {/* Upload Lecture Materials Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenLectureMaterials();
              }}
              className="group relative w-full overflow-hidden rounded-xl bg-[#f0e7da] p-3.5 shadow-sm border border-[#c5c6ce] hover:border-[#775a19] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#fed488]/40 active:scale-98 text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#fff8f2] flex items-center justify-center border border-[#c5c6ce] group-hover:border-[#775a19] shadow-sm">
                  <span className="material-symbols-outlined text-[#04162e]">upload_file</span>
                </div>
                <div>
                  <span className="font-button-text font-bold text-sm text-[#1f1b14] block">
                    강의 자료 올리기
                  </span>
                  <span className="font-ui-label text-[11px] text-[#75777e]">
                    논문 및 슬라이드 교안 분석
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#75777e] group-hover:text-[#775a19] transition-colors">
                chevron_right
              </span>
            </button>

            {/* Upload Lecture Voice Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenLectureVoice();
              }}
              className="group relative w-full overflow-hidden rounded-xl bg-[#f0e7da] p-3.5 shadow-sm border border-[#c5c6ce] hover:border-[#775a19] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#fed488]/40 active:scale-98 text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#fff8f2] flex items-center justify-center border border-[#c5c6ce] group-hover:border-[#775a19] shadow-sm">
                  <span className="material-symbols-outlined text-[#04162e]">mic</span>
                </div>
                <div>
                  <span className="font-button-text font-bold text-sm text-[#1f1b14] block">
                    강의 음성 올리기
                  </span>
                  <span className="font-ui-label text-[11px] text-[#75777e]">
                    녹음 음성 분석 및 연구 토론
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#75777e] group-hover:text-[#775a19] transition-colors">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Character Sprite Area */}
        <div className="hidden md:flex flex-grow relative items-end justify-center pointer-events-none pb-4">
          <img
            alt={professor.name}
            className="h-[88vh] max-h-[850px] w-auto object-contain object-bottom drop-shadow-2xl filter brightness-105 scale-105 origin-bottom transition-all duration-700 hover:scale-110"
            src={professor.spriteUrl}
          />
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2.5 pb-safe border-t border-[#ffdea5]/40 bg-[#04162e]/95 backdrop-blur-lg shadow-2xl rounded-t-2xl md:hidden pointer-events-auto">
        <button
          onClick={() => {
            soundManager.playPageTurn();
            onStartDialogue();
          }}
          className="flex flex-col items-center justify-center bg-[#fed488]/20 text-[#ffdea5] rounded-xl px-4 py-1.5 border border-[#ffdea5] active:scale-95 duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg mb-0.5">forum</span>
          <span className="font-ui-label text-[10px] uppercase tracking-widest font-semibold">
            Talk
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playPenWrite();
            onOpenAssignment();
          }}
          className="flex flex-col items-center justify-center text-[#b6c7e7] px-3 py-1.5 hover:text-[#ffdea5] active:scale-95 duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg mb-0.5">assignment_turned_in</span>
          <span className="font-ui-label text-[10px] uppercase tracking-widest">Feedback</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenLectureMaterials();
          }}
          className="flex flex-col items-center justify-center text-[#b6c7e7] px-3 py-1.5 hover:text-[#ffdea5] active:scale-95 duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg mb-0.5">upload_file</span>
          <span className="font-ui-label text-[10px] uppercase tracking-widest">Materials</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenLectureVoice();
          }}
          className="flex flex-col items-center justify-center text-[#b6c7e7] px-3 py-1.5 hover:text-[#ffdea5] active:scale-95 duration-150 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg mb-0.5">mic</span>
          <span className="font-ui-label text-[10px] uppercase tracking-widest">Lecture</span>
        </button>
      </nav>
    </div>
  );
};
