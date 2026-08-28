import React, { useState, useRef } from 'react';
import { Professor } from '../types';
import { TopAppBar } from './TopAppBar';
import { soundManager } from '../utils/audio';

interface ProfessorCreateScreenProps {
  onBack: () => void;
  onCreated: (newProf: Professor) => void;
}

const AVATAR_OPTIONS = [
  {
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeVI2jiBGdUeB6ttfV6_1SIXp6YDKaz09NHo5DdZAEBGUFQorIoCSuGXRsOcUWhecMfs0i2LxlO8-M9MPmVXi208FUZCRj2GVuAM9-BpT-IH5iCrARIt-8d5hP9YCkMiJCkDQCZI5DU8qCRA7FO-P4tE3i0M4WYefKKCIAmLtERNvdsx_kayabK4Yc1-Ja6gj4iJbu7pny2O5qZiiN7Nd-sNBSd5bwRViJ4NmxNQC1JaKwXl749HG4',
    sprite: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANn4_4OGqXFix3afOMPnwO91ios5HAp7ABAUdqVzEp4_UV5B00rNTKQdvkNpBZuAA5jWeWR4tG4xHtuIKiYzFENOhDU94NS23BWx4zlfcUR55Y47-_INerB3obXGuuMrWBGCaKIkjnjgN3kemKOdLXCHVDppRBdllamTKx2sb5xtgq8vyx4XtYERF8pCWZzkuzMlYPXoSHoDAJJzR_bFfmlhyv-uV89NeNP_CYG-PXt1lOEa-j4TMA',
    label: '클래식 정통 학자'
  },
  {
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCunNdNtQlkQB-G1M8n2-DWZoZbs-EOk1LV-jblK4RwebHF_7sj87xtkiP2HQjfrz3pkbw3GyY6ChpIIIctEw1xVlaQ_PefhxfTKrRnx8JkvkTcwsuFvJyqJzfFzmbPTvUKk5sctOXv0ip-K4ZlpUGH5pDO4Lb_gxTKWgPWYVcAoVDQQp4-QthIu6yKnfSD_0fv8vIk5cA91giPDnrXayXv4om6lMu-D1LAnAnSudjbIetgpyck7913',
    sprite: 'https://lh3.googleusercontent.com/aida/AEtjO1Xb-UTM4_RU0AALtvshgnKwHv3HYWnztyVLxPKKu_UMu_OaYJnFLeV3EsiylQVwrLvNVWt2UH6GZNcOEfBssWx5Cbq2zwoeM7M87XNvHTKqh-ULNA33l-xu0QSa0EM0GuSeclzkFvGBI4PeC2z-aj1Sdsyl5Q4JYG8DW0mkbpMgrn8esz1EXPvuKY4VFpBWU95JYYPy9DEODZRGntnVNLDDE6jcrvk7xH-0EIA2UOC8spkDpa15-Kejt1Q',
    label: '날카로운 분석가'
  },
  {
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBValLxpQQ_IU52peZB0xRLHatrHomlSzeGy7YGpKyzqXhLLEATLTTCV4IjzFgvqu6RpZeef_k9QSHcNS3Np97ig4phUB_gY6Di536bJbwV-ZBfKE8XwvnUAIDRdX67yhyCEGoXUhCg23jd8mutPXJNXaFautNP6gp1xnhUzoaaz4TR1sAGjN76tGT2EBfs7MnvwoRfN-sdcSo2WlNceaiTpR80aUKqt8ng2C9uEQNPEBoBCf7QYzOd',
    sprite: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANn4_4OGqXFix3afOMPnwO91ios5HAp7ABAUdqVzEp4_UV5B00rNTKQdvkNpBZuAA5jWeWR4tG4xHtuIKiYzFENOhDU94NS23BWx4zlfcUR55Y47-_INerB3obXGuuMrWBGCaKIkjnjgN3kemKOdLXCHVDppRBdllamTKx2sb5xtgq8vyx4XtYERF8pCWZzkuzMlYPXoSHoDAJJzR_bFfmlhyv-uV89NeNP_CYG-PXt1lOEa-j4TMA',
    label: '다정한 지도자'
  },
  {
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ3qODKOPfGAjSWB45WHCcL4VhD-gR3FB8yBwZk1rb0i2gtEKZyhrMf3wBIBOoU89Vu-o8IrJGR3eVqn_WgGM1qEihdMhJt_99eZZJQWm4XAjxks2Yunid66sJwgc4oXcsC6JXXnCLFU0Ls3mZeTcaKMc37acvpQrEo5xyy_ZMHq8w5vYP2omLvfiN3LOSvXa5FD8qJV2oKMN-tynSIoJYr_4DgllWP4rL2TbfGey13tiO5GZdDDmo',
    sprite: 'https://lh3.googleusercontent.com/aida/AEtjO1Xb-UTM4_RU0AALtvshgnKwHv3HYWnztyVLxPKKu_UMu_OaYJnFLeV3EsiylQVwrLvNVWt2UH6GZNcOEfBssWx5Cbq2zwoeM7M87XNvHTKqh-ULNA33l-xu0QSa0EM0GuSeclzkFvGBI4PeC2z-aj1Sdsyl5Q4JYG8DW0mkbpMgrn8esz1EXPvuKY4VFpBWU95JYYPy9DEODZRGntnVNLDDE6jcrvk7xH-0EIA2UOC8spkDpa15-Kejt1Q',
    label: '차가운 천재 석학'
  }
];

export const ProfessorCreateScreen: React.FC<ProfessorCreateScreenProps> = ({
  onBack,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [field, setField] = useState('인문학 및 철학');
  const [traits, setTraits] = useState('');
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);
  const [uploadedVoiceName, setUploadedVoiceName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedVoiceName(file.name);
      soundManager.playPenWrite();
    }
  };

  const toggleRecording = () => {
    soundManager.playClick();
    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setUploadedVoiceName(`Voice_Sample_${new Date().toISOString().slice(0, 10)}.wav`);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profName = name.trim() || '한서진 교수';
    const profField = field.trim() || '철학 및 미학';
    const profTraits = traits.trim() || '학구적이며 학생의 독창적인 해석을 무엇보다 소중히 여기는 헌신적인 교수.';

    const chosenOption = AVATAR_OPTIONS[selectedAvatarIdx];
    const newProf: Professor = {
      id: `custom-prof-${Date.now()}`,
      name: profName.endsWith('교수') ? profName : `${profName} 교수`,
      field: profField,
      title: `${profField} 전임교수`,
      avatarUrl: chosenOption.avatar,
      spriteUrl: chosenOption.sprite,
      bgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKTF9IFICAKAqfPbSoZ35rKaZIonFA_1as5ltp3F7nfZ0gueYOV_QA2MuQ7a2F_r9snTotg1p8Q3Z67czK2kehdCGjoEaikcUxU0NtaJfTv_LqyLO8jKs7knn5QIR4GSgQMgWESk-ObBHVfxyuR-xEM8Oxp1v05Z8c9D3i_XgiPub_DYtr13vF29HkBIm1lbfoPqOxz1zySGUxm93gHxVibonLy-8UPr8vVGxB_I61QBecO7u3UOvK',
      affection: 50,
      stress: 20,
      traits: profTraits,
      specialty: `${profField} 심층 연구`,
      voiceSampleName: uploadedVoiceName || 'Default_Voice_Parchment.wav',
      customCreated: true,
      dialogues: [
        {
          id: 'node-1',
          speaker: profName.endsWith('교수') ? profName : `${profName} 교수`,
          text: `학회에 등록된 후 자네와 처음 마주하는 자리로군. ${profField} 분야에서 어떤 새로운 비전을 탐구하고 싶나?`,
          expression: 'thoughtful',
          choices: [
            {
              text: '교수님의 연구 방법론을 이어받아 학술적 깊이를 넓히고 싶습니다.',
              nextId: 'node-2',
              affectionDelta: 12,
              stressDelta: -8,
              feedback: '교수님이 흡족한 눈빛으로 연구 계획서를 살펴봅니다.'
            },
            {
              text: '기존의 통념을 깨는 독창적인 가설을 증명하고자 합니다.',
              nextId: 'node-2',
              affectionDelta: 15,
              stressDelta: -5,
              feedback: '교수님이 자네의 대담한 발상에 매료되었습니다.'
            }
          ]
        },
        {
          id: 'node-2',
          speaker: profName.endsWith('교수') ? profName : `${profName} 교수`,
          text: '매우 훌륭한 각오일세. 앞으로 내 연구실의 문은 자네에게 언제든 열려 있네. 함께 최고의 논문을 완성해보세.',
          expression: 'smile'
        }
      ]
    };

    soundManager.playAffectionUp();
    onCreated(newProf);
  };

  return (
    <div className="bg-[#fff8f2] text-[#1f1b14] min-h-screen flex flex-col relative pb-16 select-none">
      {/* Top Header */}
      <TopAppBar
        title="Scholarly Affection"
        showBack={true}
        onBack={onBack}
      />

      {/* Main Content Parchment Canvas */}
      <main className="flex-grow pt-28 px-4 sm:px-8 pb-12 flex justify-center items-start">
        <div className="w-full max-w-4xl bg-[#f0e7da] rounded-2xl border-2 border-[#775a19] shadow-2xl relative p-6 sm:p-10 md:p-12 overflow-hidden">
          {/* Decorative Gold Corners */}
          <div className="gold-filigree filigree-tl"></div>
          <div className="gold-filigree filigree-tr"></div>
          <div className="gold-filigree filigree-bl"></div>
          <div className="gold-filigree filigree-br"></div>

          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="font-speaker-name text-2xl sm:text-3xl md:text-4xl text-[#04162e] font-bold mb-2">
              새로운 교수 임명
            </h2>
            <div className="w-20 h-[2px] bg-[#775a19] mx-auto"></div>
            <p className="font-dialogue-text text-[#44474d] text-sm sm:text-base mt-3 italic">
              학회에 새로운 인재와 지적 파트너를 등록합니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Professor Profile Selection */}
            <div className="space-y-2.5">
              <label className="block font-ui-label text-xs sm:text-sm font-bold text-[#04162e] uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#775a19] text-lg">face</span>
                교수 외모 및 분위기 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_OPTIONS.map((opt, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedAvatarIdx(idx);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      selectedAvatarIdx === idx
                        ? 'border-[#775a19] bg-[#ffdea5]/40 shadow-md ring-2 ring-[#775a19]/50'
                        : 'border-[#c5c6ce] bg-[#fff8f2] hover:bg-[#eae1d5]'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ffdea5]">
                      <img src={opt.avatar} alt={opt.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-ui-label text-xs font-semibold text-[#04162e] text-center">
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Name & Field Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-ui-label text-xs sm:text-sm font-bold text-[#04162e] uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#775a19] text-lg">badge</span>
                  교수 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 한서진 교수"
                  className="w-full bg-[#fff8f2] border border-[#c5c6ce] focus:border-[#775a19] focus:ring-1 focus:ring-[#775a19] rounded-lg px-3.5 py-2.5 font-speaker-name text-base text-[#04162e] outline-none placeholder:text-[#75777e]/60"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-ui-label text-xs sm:text-sm font-bold text-[#04162e] uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#775a19] text-lg">menu_book</span>
                  학문 전공 / 연구 분야
                </label>
                <input
                  type="text"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="예: 현대철학, 언어학, 인공지능 윤리"
                  className="w-full bg-[#fff8f2] border border-[#c5c6ce] focus:border-[#775a19] focus:ring-1 focus:ring-[#775a19] rounded-lg px-3.5 py-2.5 font-ui-label text-sm text-[#04162e] outline-none placeholder:text-[#75777e]/60"
                />
              </div>
            </div>

            {/* Voice Upload Area */}
            <div className="space-y-2.5">
              <label className="block font-ui-label text-xs sm:text-sm font-bold text-[#04162e] uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#775a19] text-lg">mic</span>
                교수 음성 올리기 (또는 직접 녹음)
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleVoiceUpload}
                accept="audio/*"
                className="hidden"
              />

              <div className="border-2 border-dashed border-[#c5c6ce] hover:border-[#775a19] rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center bg-[#f6ede0]/50 hover:bg-[#f6ede0] transition-colors cursor-pointer group">
                <div className="flex gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-full bg-[#fed488]/40 text-[#775a19] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-2xl">upload_file</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform shadow-sm cursor-pointer ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-[#fed488]/40 text-[#775a19] hover:scale-110'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {isRecording ? 'stop' : 'mic'}
                    </span>
                  </button>
                </div>

                {isRecording ? (
                  <p className="font-ui-label text-sm text-red-600 font-bold animate-pulse">
                    녹음 중... {recordingSeconds}초 (마이크 입력 감지 중)
                  </p>
                ) : uploadedVoiceName ? (
                  <div className="flex items-center gap-2 text-[#775a19] font-medium text-sm">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>등록된 음성: {uploadedVoiceName}</span>
                  </div>
                ) : (
                  <>
                    <p className="font-dialogue-text text-[#44474d] text-sm mb-1 text-center">
                      음성 기록 (WAV, MP3)을 클릭하여 업로드하거나 마이크로 음성을 녹음하십시오.
                    </p>
                    <p className="font-ui-label text-[#75777e] text-xs">최대 10MB 권장</p>
                  </>
                )}
              </div>
            </div>

            {/* Traits Text Area */}
            <div className="space-y-2.5">
              <label
                htmlFor="traits"
                className="block font-ui-label text-xs sm:text-sm font-bold text-[#04162e] uppercase tracking-widest flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[#775a19] text-lg">history_edu</span>
                교수 특징 적기
              </label>
              <div className="relative bg-[#fff8f2] rounded-xl border border-[#c5c6ce] p-3 shadow-inner">
                <textarea
                  id="traits"
                  rows={4}
                  value={traits}
                  onChange={(e) => setTraits(e.target.value)}
                  placeholder="교수의 학문적 성향, 성격, 주요 업적 등을 상세히 서술해 주십시오..."
                  className="w-full bg-transparent border-0 font-dialogue-text text-base text-[#1f1b14] resize-none focus:outline-none placeholder:text-[#75777e]/70 placeholder:italic leading-relaxed"
                ></textarea>
              </div>
            </div>

            {/* Create Button */}
            <div className="pt-4 flex justify-center">
              <button
                type="submit"
                className="group relative px-10 py-3.5 bg-[#f6ede0] hover:bg-[#775a19] text-[#04162e] hover:text-[#fff8f2] rounded-full border-2 border-[#775a19] shadow-md hover:shadow-xl transition-all active:scale-95 overflow-hidden flex items-center gap-3 font-button-text font-bold text-base cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>교수 만들기</span>
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                </span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
