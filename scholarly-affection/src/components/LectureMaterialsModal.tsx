import React, { useState, useRef } from 'react';
import { Professor, LectureMaterial } from '../types';
import { soundManager } from '../utils/audio';

interface LectureMaterialsModalProps {
  professor: Professor;
  materials: LectureMaterial[];
  onAddMaterial: (material: LectureMaterial) => void;
  onClose: () => void;
}

export const LectureMaterialsModal: React.FC<LectureMaterialsModalProps> = ({
  professor,
  materials,
  onAddMaterial,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
      soundManager.playPenWrite();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    soundManager.playPageTurn();
    setIsAnalyzing(true);

    setTimeout(() => {
      soundManager.playGradeChime();
      soundManager.playAffectionUp();

      const newMat: LectureMaterial = {
        id: `mat-${Date.now()}`,
        professorId: professor.id,
        title: title.trim(),
        fileName: file ? file.name : `${title.trim()}_Document.pdf`,
        fileSize: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '3.8 MB',
        summary: `본 강의 자료는 ${professor.field} 전공 연구의 핵심 개념 및 최신 학술 동향을 체계적으로 정리함. 텍스트의 유기적 구조와 핵심 논제 3가지를 도출하여 학제적 탐구 기반을 마련함.`,
        keyQuestions: [
          `${professor.field} 연구에서 본 자료의 주요 논증이 지니는 학문적 의의는 무엇인가?`,
          '기존 이론과의 차별점을 구체적인 사례를 통해 증명할 수 있는가?',
        ],
        professorComment: `${professor.name} 코멘트: "자네가 올린 교안을 꼼꼼히 검토했네. 연구실 세미나 자료로 즉시 활용할 수 있을 만큼 완성도가 높군."`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };

      onAddMaterial(newMat);
      setIsAnalyzing(false);
      setTitle('');
      setFile(null);
    }, 1500);
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
            <span className="material-symbols-outlined text-2xl">upload_file</span>
          </div>
          <div>
            <h3 className="font-speaker-name text-2xl font-bold text-[#04162e]">
              강의 자료실 (Lecture Materials)
            </h3>
            <p className="font-dialogue-text text-sm text-[#44474d] italic">
              지도 교수: <span className="font-bold text-[#775a19]">{professor.name}</span>
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-[#fff8f2] p-4 rounded-xl border border-[#c5c6ce]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#c5c6ce] hover:border-[#775a19] rounded-xl p-5 flex flex-col items-center justify-center bg-[#f6ede0]/40 hover:bg-[#f6ede0] transition-colors cursor-pointer text-center"
          >
            <span className="material-symbols-outlined text-3xl text-[#775a19] mb-1">
              cloud_upload
            </span>
            {file ? (
              <span className="font-speaker-name text-sm font-bold text-[#04162e]">
                선택된 파일: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            ) : (
              <>
                <p className="font-dialogue-text text-sm text-[#1f1b14]">
                  강의 슬라이드, 논문 PDF, 교안 파일을 드래그하거나 클릭하여 업로드하십시오.
                </p>
                <p className="font-ui-label text-xs text-[#75777e] mt-1">PDF, PPTX, DOCX 지원</p>
              </>
            )}
          </div>

          <div>
            <label className="block font-ui-label text-xs font-bold text-[#04162e] uppercase mb-1">
              자료 제목 및 챕터명
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 제8강 - 비판적 해석학과 미학적 지평"
              className="w-full bg-[#fff8f2] border border-[#c5c6ce] focus:border-[#775a19] rounded-lg px-3.5 py-2 font-speaker-name text-sm text-[#04162e] outline-none"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#775a19] hover:bg-[#04162e] text-[#fff8f2] rounded-xl font-button-text font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                  <span>교수 연구실로 전송 및 분석 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">publish</span>
                  <span>강의 자료 등록 및 교수 분석 요청</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Materials List */}
        <div className="space-y-3 pt-2">
          <h4 className="font-speaker-name text-lg font-bold text-[#04162e]">
            등록된 연구 자료 목록 ({materials.length})
          </h4>
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="p-4 rounded-xl border border-[#c5c6ce] bg-[#fff8f2] shadow-sm space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-2xl text-[#775a19]">
                    description
                  </span>
                  <div>
                    <h5 className="font-speaker-name font-bold text-base text-[#04162e]">
                      {mat.title}
                    </h5>
                    <span className="font-ui-label text-xs text-[#75777e]">
                      {mat.fileName} ({mat.fileSize}) • {mat.timestamp}
                    </span>
                  </div>
                </div>
              </div>

              <p className="font-dialogue-text text-xs sm:text-sm text-[#44474d] bg-[#f6ede0]/60 p-2.5 rounded-lg leading-relaxed">
                {mat.summary}
              </p>

              {mat.keyQuestions && mat.keyQuestions.length > 0 && (
                <div className="space-y-1">
                  <span className="font-ui-label text-xs font-bold text-[#775a19]">
                    교수 추천 연구 질문:
                  </span>
                  <ul className="list-disc list-inside text-xs text-[#1f1b14] space-y-0.5 pl-1 font-dialogue-text">
                    {mat.keyQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs italic text-[#775a19] font-dialogue-text bg-[#fed488]/20 p-2 rounded border-l-2 border-[#775a19]">
                {mat.professorComment}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
