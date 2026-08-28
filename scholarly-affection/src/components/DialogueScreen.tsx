import React, { useState, useEffect, useRef } from 'react';
import { Professor, DialogueNode, DialogueChoice } from '../types';
import { soundManager } from '../utils/audio';

interface DialogueScreenProps {
  professor: Professor;
  onBack: () => void;
  onUpdateProfessorStats: (profId: string, affectionDelta: number, stressDelta: number) => void;
  onSaveGame: (dialogueId: string, textSnippet: string) => void;
  onOpenLoadGame: () => void;
}

export const DialogueScreen: React.FC<DialogueScreenProps> = ({
  professor,
  onBack,
  onUpdateProfessorStats,
  onSaveGame,
  onOpenLoadGame,
}) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>('node-1');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [isAuto, setIsAuto] = useState<boolean>(false);
  const [showLog, setShowLog] = useState<boolean>(false);
  const [logHistory, setLogHistory] = useState<{ speaker: string; text: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentNode: DialogueNode =
    professor.dialogues.find((d) => d.id === currentNodeId) ||
    professor.dialogues[0] || {
      id: 'fallback',
      speaker: professor.name,
      text: '자네와 함께 학문의 깊이를 나눌 수 있어 언제나 기쁘군.',
    };

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter effect
  useEffect(() => {
    setIsTyping(true);
    setDisplayedText('');
    let charIndex = 0;
    const fullText = currentNode.text;

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex + 1));
        if (charIndex % 3 === 0) {
          soundManager.playTypeTick();
        }
        charIndex++;
      } else {
        setIsTyping(false);
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);

        // Add to log if not already last
        setLogHistory((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].text === fullText) {
            return prev;
          }
          return [...prev, { speaker: currentNode.speaker, text: fullText }];
        });

        // Auto mode handler
        if (isAuto && (!currentNode.choices || currentNode.choices.length === 0)) {
          autoTimerRef.current = setTimeout(() => {
            handleAdvanceDialogue();
          }, 2500);
        }
      }
    }, 28);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [currentNodeId, isAuto]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAdvanceDialogue = () => {
    if (isTyping) {
      // Instant finish typing
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedText(currentNode.text);
      setIsTyping(false);
      return;
    }

    if (currentNode.choices && currentNode.choices.length > 0) {
      // User must pick a choice
      return;
    }

    if (currentNode.nextId) {
      soundManager.playDialogueClick();
      setCurrentNodeId(currentNode.nextId);
    } else {
      // Loop or return to start
      soundManager.playPageTurn();
      showToast('대화가 완료되었습니다. 연구실로 복귀합니다.');
      setTimeout(() => {
        onBack();
      }, 1200);
    }
  };

  const handleSelectChoice = (choice: DialogueChoice) => {
    soundManager.playClick();
    if (choice.affectionDelta > 0) {
      soundManager.playAffectionUp();
    }
    onUpdateProfessorStats(professor.id, choice.affectionDelta, choice.stressDelta);

    showToast(choice.feedback || `호감도 +${choice.affectionDelta}%`);

    if (choice.nextId) {
      setCurrentNodeId(choice.nextId);
    } else {
      onBack();
    }
  };

  const handleSave = () => {
    soundManager.playPenWrite();
    onSaveGame(currentNodeId, currentNode.text);
    showToast('현재 위치가 성공적으로 저장되었습니다.');
  };

  const handleSkip = () => {
    soundManager.playClick();
    if (currentNode.choices && currentNode.choices.length > 0) {
      setIsTyping(false);
      setDisplayedText(currentNode.text);
    } else if (currentNode.nextId) {
      setCurrentNodeId(currentNode.nextId);
    } else {
      onBack();
    }
  };

  return (
    <div className="bg-[#fff8f2] text-[#1f1b14] overflow-hidden selection:bg-[#fed488] selection:text-[#785a1a] h-screen w-screen relative select-none">
      {/* Background Environment */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${professor.bgUrl}')` }}
        ></div>
        <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>
      </div>

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-12 h-16 bg-[#04162e]/85 backdrop-blur-md border-b border-[#775a19]/40 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onBack();
            }}
            className="text-[#ffdea5] hover:text-[#e9c176] transition-colors p-1.5 rounded-lg hover:bg-white/10"
            title="연구실로 나가기"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <span className="font-speaker-name text-lg md:text-xl text-[#ffdea5] italic">
            Scholarly Affection
          </span>
        </div>

        {/* HUD Quick Icons */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-[#b6c7e7]">
          <button
            onClick={() => {
              soundManager.playClick();
              setShowLog(true);
            }}
            title="대화 로그"
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">history</span>
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAuto(!isAuto);
            }}
            title={isAuto ? '자동 재생 끄기' : '자동 재생 켜기'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isAuto ? 'text-[#fed488] bg-[#fed488]/20' : 'hover:text-[#ffdea5] hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-xl">auto_mode</span>
          </button>
          <button
            onClick={handleSkip}
            title="스킵"
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">fast_forward</span>
          </button>
          <button
            onClick={handleSave}
            title="기록 저장"
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">save</span>
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenLoadGame();
            }}
            title="기록 불러오기"
            className="hover:text-[#ffdea5] transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">folder_open</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#04162e]/95 text-[#ffdea5] border border-[#ffdea5] px-6 py-2.5 rounded-full shadow-2xl font-ui-label text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-base text-[#fed488]">stars</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Character Sprite Layer */}
      <div className="absolute inset-0 z-10 flex justify-center md:justify-end items-end pointer-events-none pr-0 md:pr-[12%] pb-24 md:pb-0">
        <img
          className="h-[75vh] md:h-[86vh] object-contain object-bottom drop-shadow-2xl transition-transform duration-500 hover:scale-105"
          alt={professor.name}
          src={professor.spriteUrl}
        />
      </div>

      {/* UI Overlay / Dialogue HUD */}
      <main className="absolute inset-0 z-20 flex flex-col justify-end items-center pb-6 sm:pb-10 px-4 sm:px-8 pointer-events-none">
        {/* HUD Controls Bar */}
        <div className="w-full max-w-4xl flex justify-end gap-2 mb-2 pointer-events-auto">
          <button
            onClick={() => {
              soundManager.playClick();
              setShowLog(true);
            }}
            className="bg-[#eae1d5]/90 backdrop-blur-sm border border-[#c5c6ce] rounded-lg px-3 py-1 font-button-text font-semibold text-xs text-[#44474d] hover:bg-[#ffdea5] hover:text-[#04162e] transition-colors shadow-sm cursor-pointer"
          >
            Log
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAuto(!isAuto);
            }}
            className={`border rounded-lg px-3 py-1 font-button-text font-semibold text-xs transition-colors shadow-sm cursor-pointer ${
              isAuto
                ? 'bg-[#775a19] text-[#fff8f2] border-[#775a19]'
                : 'bg-[#eae1d5]/90 backdrop-blur-sm border-[#c5c6ce] text-[#44474d] hover:bg-[#ffdea5] hover:text-[#04162e]'
            }`}
          >
            {isAuto ? 'Auto ON' : 'Auto'}
          </button>
          <button
            onClick={handleSkip}
            className="bg-[#eae1d5]/90 backdrop-blur-sm border border-[#c5c6ce] rounded-lg px-3 py-1 font-button-text font-semibold text-xs text-[#44474d] hover:bg-[#ffdea5] hover:text-[#04162e] transition-colors shadow-sm cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            className="bg-[#eae1d5]/90 backdrop-blur-sm border border-[#c5c6ce] rounded-lg px-3 py-1 font-button-text font-semibold text-xs text-[#44474d] hover:bg-[#ffdea5] hover:text-[#04162e] transition-colors shadow-sm cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenLoadGame();
            }}
            className="bg-[#eae1d5]/90 backdrop-blur-sm border border-[#c5c6ce] rounded-lg px-3 py-1 font-button-text font-semibold text-xs text-[#44474d] hover:bg-[#ffdea5] hover:text-[#04162e] transition-colors shadow-sm cursor-pointer"
          >
            Load
          </button>
        </div>

        {/* Dialogue Container */}
        <div className="w-full max-w-4xl relative pointer-events-auto">
          {/* Speaker Name Tag */}
          <div className="absolute -top-6 left-4 sm:left-8 z-30">
            <div className="bg-[#fff8f2] px-5 py-2 rounded-t-xl border-t border-l border-r border-[#775a19]/50 shadow-[0_-2px_10px_rgba(0,0,0,0.15)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#775a19] text-base">push_pin</span>
              <span className="font-speaker-name font-bold text-base sm:text-lg text-[#04162e]">
                {currentNode.speaker}
              </span>
            </div>
          </div>

          {/* Dialogue Text Box */}
          <div
            onClick={handleAdvanceDialogue}
            className="glass-panel-dialogue rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden group cursor-pointer hover:border-[#ffdea5] transition-all"
          >
            {/* Decorative Corner Accents */}
            <div className="gold-filigree filigree-tl"></div>
            <div className="gold-filigree filigree-tr"></div>
            <div className="gold-filigree filigree-bl"></div>
            <div className="gold-filigree filigree-br"></div>

            {/* Text Content */}
            <p className="font-dialogue-text text-base sm:text-lg md:text-xl text-[#ffffff] min-h-[80px] sm:min-h-[96px] text-shadow-elegant pt-2 leading-relaxed">
              {displayedText}
              {isTyping && <span className="inline-block w-2 h-5 bg-[#ffdea5] ml-1 animate-pulse" />}
            </p>

            {/* Next Indicator Arrow */}
            {!isTyping && (!currentNode.choices || currentNode.choices.length === 0) && (
              <div className="absolute bottom-4 right-6 animate-bounce text-[#ffdea5]">
                <span className="material-symbols-outlined text-2xl">arrow_drop_down</span>
              </div>
            )}
          </div>

          {/* Choices Panel */}
          {!isTyping && currentNode.choices && currentNode.choices.length > 0 && (
            <div className="mt-3.5 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {currentNode.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectChoice(choice)}
                  className="group flex items-center justify-between w-full px-5 py-3.5 bg-[#f6ede0]/95 hover:bg-[#ffdea5] text-[#04162e] border border-[#775a19] rounded-xl shadow-lg hover:shadow-xl font-dialogue-text text-sm sm:text-base font-semibold transition-all hover:-translate-y-0.5 active:scale-98 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#775a19] text-[#fff8f2] text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{choice.text}</span>
                  </span>
                  <span className="font-ui-label text-xs text-[#775a19] font-bold group-hover:text-[#04162e] flex items-center gap-1">
                    <span>선택</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Log Modal */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel-light w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center border-b border-[#775a19]/30 pb-3 mb-4">
              <h3 className="font-speaker-name text-xl font-bold text-[#04162e]">
                대화 기록 (Dialogue Log)
              </h3>
              <button
                onClick={() => setShowLog(false)}
                className="text-[#775a19] hover:text-[#04162e] p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar flex-grow">
              {logHistory.map((item, idx) => (
                <div key={idx} className="border-b border-[#c5c6ce]/40 pb-2">
                  <span className="font-speaker-name text-xs font-bold text-[#775a19] block mb-1">
                    {item.speaker}
                  </span>
                  <p className="font-dialogue-text text-sm text-[#1f1b14]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
