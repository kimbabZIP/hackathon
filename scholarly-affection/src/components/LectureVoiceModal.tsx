import React, { useState, useRef } from 'react';
import { Professor, LectureVoice } from '../types';
import { soundManager } from '../utils/audio';

interface LectureVoiceModalProps {
  professor: Professor;
  voices: LectureVoice[];
  onAddVoice: (voice: LectureVoice) => void;
  onClose: () => void;
}

export const LectureVoiceModal: React.FC<LectureVoiceModalProps> = ({
  professor,
  voices,
  onAddVoice,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleRecording = () => {
    soundManager.playClick();
    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (!title) {
        setTitle(`${professor.name} 연구실 세미나 구술 기록`);
      }
    } else {
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
      soundManager.playPenWrite();
    }
  };

  const handleSaveVoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    soundManager.playPageTurn();
    setIsProcessing(true);

    setTimeout(() => {
      soundManager.playGradeChime();
      soundManager.playAffectionUp();

      const newVoice: LectureVoice = {
        id: `voice-${Date.now()}`,
        professorId: professor.id,
        title: title.trim(),
        duration: isRecording ? `${Math.floor(seconds / 60)}분 ${seconds % 60}초` : '11분 40초',
        transcriptSnippet: `"${professor.name}: 자네의 질문은 텍스트의 표피를 꿰뚫는 힘이 있더군. 이 음성 기록을 통해 자네와 함께 나눈 학문적 영감을 언제든 되살릴 수 있길 바라네."`,
        keyInsights: [
          '구술 논증의 호소력과 논리적 맥락화 방안',
          '현장 녹음 분석을 통한 토론 심화 논점 도출',
        ],
        professorReaction: `${professor.name}: "목소리로 다시 들으니 자네와 함께 마주 앉았던 그 연구실의 시간이 생생하네."`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };

      onAddVoice(newVoice);
      setIsProcessing(false);
      setTitle('');
      setSeconds(0);
    }, 1500);
  };

  const togglePlay = (id: string) => {
    soundManager.playClick();
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      setTimeout(() => {
        setPlayingId(null);
      }, 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[#04162e]/75 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative z-10 glass-panel-light w-full max-w-3xl rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
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
        <div className="flex items-center gap-4 border-b border-[#775a19]/30 pb-4">
          <div className="w-12 h-12 rounded-full bg-[#ffdea5] text-[#775a19] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">mic</span>
          </div>
          <div>
            <h3 className="font-speaker-name text-2xl font-bold text-[#04162e]">
              강의 음성 아카이브 (Lecture Voice)
            </h3>
            <p className="font-dialogue-text text-sm text-[#44474d] italic">
              지도 교수: <span className="font-bold text-[#775a19]">{professor.name}</span>
            </p>
          </div>
        </div>

        {/* Record & Upload Form */}
        <form onSubmit={handleSaveVoice} className="space-y-4 bg-[#fff8f2] p-4 rounded-xl border border-[#c5c6ce]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 p-5 rounded-xl bg-[#f6ede0]/50 border border-[#e9c176]">
            {/* Mic Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-300'
                    : 'bg-[#775a19] hover:bg-[#04162e] text-[#ffdea5]'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">
                  {isRecording ? 'stop' : 'mic'}
                </span>
              </button>
              <span className="font-ui-label text-xs font-bold text-[#04162e]">
                {isRecording ? `녹음 중: ${seconds}초` : '마이크 실시간 녹음'}
              </span>
            </div>

            <div className="text-sm font-speaker-name text-[#75777e] italic">또는</div>

            {/* Upload File Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-[#f0e7da] hover:bg-[#ffdea5] text-[#775a19] border border-[#775a19] flex items-center justify-center shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl">audio_file</span>
              </button>
              <span className="font-ui-label text-xs font-bold text-[#04162e]">
                음성 파일 업로드 (MP3, WAV)
              </span>
            </div>
          </div>

          <div>
            <label className="block font-ui-label text-xs font-bold text-[#04162e] uppercase mb-1">
              음성 기록 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 제9강 - 고전문학의 운율과 감각적 상상력"
              className="w-full bg-[#fff8f2] border border-[#c5c6ce] focus:border-[#775a19] rounded-lg px-3.5 py-2 font-speaker-name text-sm text-[#04162e] outline-none"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#775a19] hover:bg-[#04162e] text-[#fff8f2] rounded-xl font-button-text font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                  <span>음성 전사 및 교수 리액션 생성 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>음성 등록 및 연구 아카이브 저장</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Voices List */}
        <div className="space-y-3 pt-2">
          <h4 className="font-speaker-name text-lg font-bold text-[#04162e]">
            보관된 음성 기록 ({voices.length})
          </h4>
          {voices.map((v) => {
            const isPlaying = playingId === v.id;
            return (
              <div
                key={v.id}
                className="p-4 rounded-xl border border-[#c5c6ce] bg-[#fff8f2] shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePlay(v.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-[#775a19] text-white animate-pulse'
                          : 'bg-[#ffdea5] text-[#04162e] hover:bg-[#775a19] hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <div>
                      <h5 className="font-speaker-name font-bold text-base text-[#04162e]">
                        {v.title}
                      </h5>
                      <span className="font-ui-label text-xs text-[#75777e]">
                        재생 시간: {v.duration} • {v.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Audio Waveform */}
                <div className="flex items-center gap-1 h-6 bg-[#f6ede0] px-3 rounded-lg overflow-hidden">
                  {[40, 65, 80, 50, 95, 30, 70, 85, 45, 90, 60, 75, 55, 85, 40, 70, 90, 60, 45, 80].map(
                    (height, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          isPlaying ? 'bg-[#775a19] animate-bounce' : 'bg-[#c5c6ce]'
                        }`}
                        style={{
                          height: isPlaying ? `${Math.random() * 80 + 20}%` : `${height}%`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      ></div>
                    )
                  )}
                </div>

                {/* Transcript Snippet */}
                <p className="font-dialogue-text text-xs sm:text-sm text-[#1f1b14] bg-[#f6ede0]/70 p-2.5 rounded-lg italic">
                  {v.transcriptSnippet}
                </p>

                {/* Professor Reaction */}
                <div className="text-xs italic text-[#775a19] font-dialogue-text bg-[#fed488]/20 p-2 rounded border-l-2 border-[#775a19]">
                  {v.professorReaction}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
