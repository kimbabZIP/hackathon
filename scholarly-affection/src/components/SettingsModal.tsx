import React, { useState } from 'react';
import { soundManager } from '../utils/audio';

interface SettingsModalProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  soundEnabled,
  onToggleSound,
  onResetData,
  onClose,
}) => {
  const [volume, setVolume] = useState(60);
  const [textSpeed, setTextSpeed] = useState<'normal' | 'fast' | 'slow'>('normal');

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    soundManager.volume = val / 100;
    soundManager.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[#04162e]/75 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative z-10 glass-panel-light w-full max-w-lg rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
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
            환경 설정 (Settings)
          </h3>
          <p className="font-dialogue-text text-xs sm:text-sm text-[#44474d] italic mt-1">
            학문적 몰입을 위한 소리 및 텍스트 환경을 조정합니다.
          </p>
        </div>

        {/* Settings Controls */}
        <div className="space-y-5">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#fff8f2] rounded-xl border border-[#c5c6ce]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-[#775a19]">
                {soundEnabled ? 'volume_up' : 'volume_off'}
              </span>
              <span className="font-button-text text-sm font-bold text-[#04162e]">
                효과음 및 배경음
              </span>
            </div>
            <button
              onClick={() => {
                onToggleSound();
                soundManager.enabled = !soundEnabled;
              }}
              className={`px-4 py-1.5 rounded-full font-ui-label text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#775a19] text-white shadow-sm'
                  : 'bg-[#c5c6ce] text-[#44474d]'
              }`}
            >
              {soundEnabled ? '활성화' : '음소거'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2 p-3 bg-[#fff8f2] rounded-xl border border-[#c5c6ce]">
            <div className="flex justify-between items-center text-xs font-bold font-ui-label text-[#04162e]">
              <span>음향 볼륨</span>
              <span className="text-[#775a19]">{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full accent-[#775a19] cursor-pointer"
            />
          </div>

          {/* Text Speed */}
          <div className="p-3 bg-[#fff8f2] rounded-xl border border-[#c5c6ce] space-y-2">
            <span className="block font-ui-label text-xs font-bold text-[#04162e]">
              대화 출력 속도
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['slow', 'normal', 'fast'] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    soundManager.playClick();
                    setTextSpeed(spd);
                  }}
                  className={`py-2 rounded-lg font-ui-label text-xs font-bold transition-all cursor-pointer ${
                    textSpeed === spd
                      ? 'bg-[#ffdea5] text-[#04162e] border border-[#775a19]'
                      : 'bg-[#f6ede0] text-[#44474d] hover:bg-[#eae1d5]'
                  }`}
                >
                  {spd === 'slow' ? '여유롭게' : spd === 'normal' ? '보통' : '빠르게'}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Data */}
          <div className="pt-2 flex justify-between items-center">
            <span className="font-ui-label text-xs text-[#75777e]">초기 상태로 되돌리기</span>
            <button
              onClick={() => {
                soundManager.playClick();
                if (confirm('모든 기록 및 호감도 데이터를 초기화하시겠습니까?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-xs text-[#ba1a1a] hover:bg-red-50 rounded border border-[#ba1a1a]/30 transition-colors font-bold cursor-pointer"
            >
              데이터 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
