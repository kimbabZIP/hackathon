import React from 'react';
import { soundManager } from '../utils/audio';

interface TitleScreenProps {
  onStartResearch: () => void;
  onLoadRecord: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onOpenAssignment: () => void;
  onOpenLectureMaterials: () => void;
  onOpenLectureVoice: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartResearch,
  onLoadRecord,
  onOpenGallery,
  onOpenSettings,
  onOpenAssignment,
  onOpenLectureMaterials,
  onOpenLectureVoice,
}) => {
  return (
    <div className="antialiased overflow-hidden w-screen h-screen relative text-[#1f1b14] select-none">
      {/* Full Page Background Image */}
      <div className="absolute inset-0 z-0 bg-[#04162e]">
        <img
          alt="Background"
          className="title-background-pulse w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiKTXSOUe-t6PKt6F-58eBObhqsUt2XSbbEsEtfvQRczhMCqvOkQhZMIAYis9J-YdJZEoalFib2JiF0dTtOkkb6Y49aoHo5XjXC9vnEX3lEUdpniyKRoMTBQzIDmk_NxP0Xml8S9xL-XkehK9HzyFCzNgTUFh_X5WadP-5t5XCA4j2Fuh7N1bB81IdiegQ2GNVeNDVImpQqdQaWWAwWwMdk9TwQU8aoW2eCk5iZYwBEdLFICshN0po"
        />
        {/* Warm Sunset Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#04162e]/80 via-[#04162e]/40 to-[#ffdea5]/20 mix-blend-multiply pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#04162e]/40 via-transparent to-[#04162e]/80 pointer-events-none"></div>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 w-full h-full flex flex-col justify-between p-6 sm:p-10 md:p-14 overflow-y-auto">
        {/* Logo Section */}
        <div className="flex flex-col items-start max-w-2xl mt-4 sm:mt-8">
          <div className="relative group">
            <img
              alt="Scholarly Affection Logo"
              className="h-28 sm:h-36 md:h-44 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBsVtpNnscECbTKN9iFwRWH4F2INxND6JmcXWgOhstp4vy5nLLxVBgsilD3F4XOcPJ-bXUuG79avIhdTitTgc3aj_Y0fBtJtKGEa1S4GNvAMaTH2T-pGPjmVvoKMJ2r1lfpXp1p1mjTryGtvCw_jcMVR3m2R7lIqD_ZfNZOyW6TNsSl984cpftdmcBCnUzCkltaeCjcMsvbE8ZFHPXSETpkKaJ2a6lJOnLg4VqGhf5DLYagoXwAg5-"
            />
          </div>
          <p className="mt-2 text-[#ffdea5] font-dialogue-text text-sm sm:text-base italic tracking-wide drop-shadow-md">
            학문과 이성의 전당에서 피어나는 은밀한 교감
          </p>
        </div>

        {/* Menu Navigation - Bottom Left */}
        <div className="flex flex-col gap-2.5 mt-auto mb-4 sm:mb-8 w-full max-w-sm sm:max-w-md glass-panel-title p-5 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
          {/* Primary Action */}
          <button
            onClick={() => {
              soundManager.playPageTurn();
              onStartResearch();
            }}
            className="group relative overflow-hidden flex items-center justify-center w-full px-6 py-3.5 bg-[#eae1d5] text-[#44474d] font-button-text font-bold text-base rounded-xl border border-[#775a19]/40 transition-all duration-300 hover:bg-[#775a19] hover:text-[#ffffff] hover:border-[#ffdea5] shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-98 cursor-pointer"
          >
            <span className="relative z-10 flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-[#775a19] group-hover:text-[#ffdea5] transition-colors">
                menu_book
              </span>
              <span>Start Research (연구 시작)</span>
            </span>
            <div className="absolute inset-0 bg-[#775a19]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </button>

          {/* Quick Academic Hub Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundManager.playPenWrite();
                onOpenAssignment();
              }}
              className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fff8f2]/90 hover:bg-[#eae1d5] text-[#1f1b14] hover:text-[#04162e] font-button-text font-semibold text-sm rounded-lg border border-[#c5c6ce]/60 hover:border-[#775a19] transition-all shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#775a19]">edit_note</span>
              <span>과제 첨삭 받기</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onOpenLectureMaterials();
              }}
              className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fff8f2]/90 hover:bg-[#eae1d5] text-[#1f1b14] hover:text-[#04162e] font-button-text font-semibold text-sm rounded-lg border border-[#c5c6ce]/60 hover:border-[#775a19] transition-all shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#775a19]">upload_file</span>
              <span>강의 자료 올리기</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onOpenLectureVoice();
              }}
              className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fff8f2]/90 hover:bg-[#eae1d5] text-[#1f1b14] hover:text-[#04162e] font-button-text font-semibold text-sm rounded-lg border border-[#c5c6ce]/60 hover:border-[#775a19] transition-all shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#775a19]">mic</span>
              <span>강의 음성 올리기</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onLoadRecord();
              }}
              className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-[#fff8f2]/90 hover:bg-[#eae1d5] text-[#1f1b14] hover:text-[#04162e] font-button-text font-semibold text-sm rounded-lg border border-[#c5c6ce]/60 hover:border-[#775a19] transition-all shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#775a19]">folder_open</span>
              <span>Load Record</span>
            </button>
          </div>

          {/* Bottom Secondary Row */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenGallery();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#fff8f2]/80 hover:bg-[#eae1d5] text-[#1f1b14] font-button-text text-xs rounded-lg border border-[#c5c6ce]/50 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">photo_library</span>
              <span>Gallery</span>
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenSettings();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#fff8f2]/80 hover:bg-[#eae1d5] text-[#1f1b14] font-button-text text-xs rounded-lg border border-[#c5c6ce]/50 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Version / Copyright */}
        <div className="flex justify-between items-center text-[#ffdea5]/80 font-ui-label text-xs tracking-widest pt-2">
          <span>v1.0.4 | © Aesthetica Academy</span>
          <span className="hidden sm:inline italic">Press start to immerse into scholarly romance</span>
        </div>
      </main>
    </div>
  );
};
