import { useState, useEffect } from 'react';
import {
  Screen,
  Professor,
  AssignmentRecord,
  LectureMaterial,
  LectureVoice,
  SaveSlot,
  GalleryItem,
} from './types';
import {
  INITIAL_PROFESSORS,
  INITIAL_ASSIGNMENTS,
  INITIAL_LECTURE_MATERIALS,
  INITIAL_LECTURE_VOICES,
  INITIAL_GALLERY_ITEMS,
} from './data/initialData';
import { TitleScreen } from './components/TitleScreen';
import { ProfessorSelectModal } from './components/ProfessorSelectModal';
import { ProfessorCreateScreen } from './components/ProfessorCreateScreen';
import { ProfessorInteractionScreen } from './components/ProfessorInteractionScreen';
import { DialogueScreen } from './components/DialogueScreen';
import { AssignmentReviewModal } from './components/AssignmentReviewModal';
import { LectureMaterialsModal } from './components/LectureMaterialsModal';
import { LectureVoiceModal } from './components/LectureVoiceModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { GalleryModal } from './components/GalleryModal';
import { SettingsModal } from './components/SettingsModal';
import { soundManager } from './utils/audio';

type ActiveModal =
  | 'SELECT_PROFESSOR'
  | 'ASSIGNMENT_REVIEW'
  | 'LECTURE_MATERIALS'
  | 'LECTURE_VOICE'
  | 'SAVE_RECORD'
  | 'LOAD_RECORD'
  | 'GALLERY'
  | 'SETTINGS'
  | null;

export default function App() {
  // Navigation & Modal State
  const [currentScreen, setCurrentScreen] = useState<Screen>('TITLE');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Core Data with LocalStorage Persistence
  const [professors, setProfessors] = useState<Professor[]>(() => {
    const saved = localStorage.getItem('scholarly_professors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_PROFESSORS;
  });

  const [selectedProfessorId, setSelectedProfessorId] = useState<string>(() => {
    const savedId = localStorage.getItem('scholarly_selected_prof_id');
    return savedId || INITIAL_PROFESSORS[0].id;
  });

  const [assignments, setAssignments] = useState<AssignmentRecord[]>(() => {
    const saved = localStorage.getItem('scholarly_assignments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_ASSIGNMENTS;
  });

  const [lectureMaterials, setLectureMaterials] = useState<LectureMaterial[]>(() => {
    const saved = localStorage.getItem('scholarly_materials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_LECTURE_MATERIALS;
  });

  const [lectureVoices, setLectureVoices] = useState<LectureVoice[]>(() => {
    const saved = localStorage.getItem('scholarly_voices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_LECTURE_VOICES;
  });

  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>(() => {
    const saved = localStorage.getItem('scholarly_save_slots');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      { slotId: 0, isEmpty: true },
      { slotId: 1, isEmpty: true },
      { slotId: 2, isEmpty: true },
      { slotId: 3, isEmpty: true },
    ];
  });

  const [galleryItems] = useState<GalleryItem[]>(() => {
    const saved = localStorage.getItem('scholarly_gallery');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_GALLERY_ITEMS;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('scholarly_professors', JSON.stringify(professors));
  }, [professors]);

  useEffect(() => {
    localStorage.setItem('scholarly_selected_prof_id', selectedProfessorId);
  }, [selectedProfessorId]);

  useEffect(() => {
    localStorage.setItem('scholarly_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('scholarly_materials', JSON.stringify(lectureMaterials));
  }, [lectureMaterials]);

  useEffect(() => {
    localStorage.setItem('scholarly_voices', JSON.stringify(lectureVoices));
  }, [lectureVoices]);

  useEffect(() => {
    localStorage.setItem('scholarly_save_slots', JSON.stringify(saveSlots));
  }, [saveSlots]);

  const activeProfessor =
    professors.find((p) => p.id === selectedProfessorId) || professors[0];

  const handleUpdateProfessorStats = (
    profId: string,
    affectionDelta: number,
    stressDelta: number
  ) => {
    setProfessors((prev) =>
      prev.map((p) => {
        if (p.id === profId) {
          const newAffection = Math.min(100, Math.max(0, p.affection + affectionDelta));
          const newStress = Math.min(100, Math.max(0, p.stress + stressDelta));
          return { ...p, affection: newAffection, stress: newStress };
        }
        return p;
      })
    );
  };

  const handleAddProfessor = (newProf: Professor) => {
    setProfessors((prev) => [newProf, ...prev]);
    setSelectedProfessorId(newProf.id);
    setCurrentScreen('INTERACTION');
  };

  const handleAddAssignment = (newAsg: AssignmentRecord) => {
    const nextAssignments = [newAsg, ...assignments];
    try {
      localStorage.setItem('scholarly_assignments', JSON.stringify(nextAssignments));
    } catch (error) {
      console.error('과제 첨삭 기록을 저장하지 못했습니다.', error);
      return false;
    }
    setAssignments(nextAssignments);
    handleUpdateProfessorStats(newAsg.professorId, newAsg.affectionGained, -5);
    return true;
  };

  const handleAddMaterial = (newMat: LectureMaterial) => {
    setLectureMaterials((prev) => [newMat, ...prev]);
    handleUpdateProfessorStats(newMat.professorId, 8, -4);
  };

  const handleAddVoice = (newVoice: LectureVoice) => {
    setLectureVoices((prev) => [newVoice, ...prev]);
    handleUpdateProfessorStats(newVoice.professorId, 10, -5);
  };

  const handleSaveToSlot = (slotId: number, dialogueId?: string, textSnippet?: string) => {
    const updatedSlot: SaveSlot = {
      slotId,
      isEmpty: false,
      professorId: activeProfessor.id,
      professorName: activeProfessor.name,
      avatarUrl: activeProfessor.avatarUrl,
      screen: currentScreen,
      currentDialogueId: dialogueId || 'node-1',
      snippet: textSnippet || `${activeProfessor.name} 연구실에서의 기록`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      affection: activeProfessor.affection,
      stress: activeProfessor.stress,
    };

    setSaveSlots((prev) => prev.map((s) => (s.slotId === slotId ? updatedSlot : s)));
  };

  const handleLoadFromSlot = (slot: SaveSlot) => {
    if (slot.isEmpty) return;
    if (slot.professorId) {
      setSelectedProfessorId(slot.professorId);
    }
    if (slot.screen) {
      setCurrentScreen(slot.screen);
    } else {
      setCurrentScreen('INTERACTION');
    }
    setActiveModal(null);
  };

  const handleResetData = () => {
    localStorage.clear();
    setProfessors(INITIAL_PROFESSORS);
    setSelectedProfessorId(INITIAL_PROFESSORS[0].id);
    setAssignments(INITIAL_ASSIGNMENTS);
    setLectureMaterials(INITIAL_LECTURE_MATERIALS);
    setLectureVoices(INITIAL_LECTURE_VOICES);
    setSaveSlots([
      { slotId: 0, isEmpty: true },
      { slotId: 1, isEmpty: true },
      { slotId: 2, isEmpty: true },
      { slotId: 3, isEmpty: true },
    ]);
    setCurrentScreen('TITLE');
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#fff8f2] text-[#1f1b14] relative">
      {/* 1. Title Screen */}
      {currentScreen === 'TITLE' && (
        <TitleScreen
          onStartResearch={() => {
            setActiveModal('SELECT_PROFESSOR');
          }}
          onLoadRecord={() => setActiveModal('LOAD_RECORD')}
          onOpenGallery={() => setActiveModal('GALLERY')}
          onOpenSettings={() => setActiveModal('SETTINGS')}
          onOpenAssignment={() => {
            setCurrentScreen('INTERACTION');
            setActiveModal('ASSIGNMENT_REVIEW');
          }}
          onOpenLectureMaterials={() => {
            setCurrentScreen('INTERACTION');
            setActiveModal('LECTURE_MATERIALS');
          }}
          onOpenLectureVoice={() => {
            setCurrentScreen('INTERACTION');
            setActiveModal('LECTURE_VOICE');
          }}
        />
      )}

      {/* 2. Professor Interaction / Office Screen */}
      {currentScreen === 'INTERACTION' && (
        <ProfessorInteractionScreen
          professor={activeProfessor}
          onBackToTitle={() => setCurrentScreen('TITLE')}
          onOpenSelectProfessor={() => setActiveModal('SELECT_PROFESSOR')}
          onStartDialogue={() => setCurrentScreen('DIALOGUE')}
          onOpenAssignment={() => setActiveModal('ASSIGNMENT_REVIEW')}
          onOpenLectureMaterials={() => setActiveModal('LECTURE_MATERIALS')}
          onOpenLectureVoice={() => setActiveModal('LECTURE_VOICE')}
          onOpenGallery={() => setActiveModal('GALLERY')}
          onOpenSettings={() => setActiveModal('SETTINGS')}
          onToggleSound={() => {
            setSoundEnabled(!soundEnabled);
            soundManager.enabled = !soundEnabled;
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {/* 3. Professor Creation Screen */}
      {currentScreen === 'CREATE_PROFESSOR' && (
        <ProfessorCreateScreen
          onBack={() => setCurrentScreen('INTERACTION')}
          onCreated={handleAddProfessor}
        />
      )}

      {/* 4. Visual Novel Dialogue Screen */}
      {currentScreen === 'DIALOGUE' && (
        <DialogueScreen
          professor={activeProfessor}
          onBack={() => setCurrentScreen('INTERACTION')}
          onUpdateProfessorStats={handleUpdateProfessorStats}
          onSaveGame={(dialogueId, snippet) => {
            handleSaveToSlot(0, dialogueId, snippet);
          }}
          onOpenLoadGame={() => setActiveModal('LOAD_RECORD')}
        />
      )}

      {/* Modals & Overlays */}
      {activeModal === 'SELECT_PROFESSOR' && (
        <ProfessorSelectModal
          professors={professors}
          selectedProfessorId={selectedProfessorId}
          onSelectProfessor={(prof) => {
            setSelectedProfessorId(prof.id);
            setActiveModal(null);
            setCurrentScreen('INTERACTION');
          }}
          onCreateNewProfessor={() => {
            setActiveModal(null);
            setCurrentScreen('CREATE_PROFESSOR');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'ASSIGNMENT_REVIEW' && (
        <AssignmentReviewModal
          professor={activeProfessor}
          assignments={assignments.filter((a) => a.professorId === activeProfessor.id)}
          onAddAssignment={handleAddAssignment}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'LECTURE_MATERIALS' && (
        <LectureMaterialsModal
          professor={activeProfessor}
          materials={lectureMaterials.filter((m) => m.professorId === activeProfessor.id)}
          onAddMaterial={handleAddMaterial}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'LECTURE_VOICE' && (
        <LectureVoiceModal
          professor={activeProfessor}
          voices={lectureVoices.filter((v) => v.professorId === activeProfessor.id)}
          onAddVoice={handleAddVoice}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'LOAD_RECORD' && (
        <SaveLoadModal
          mode="load"
          slots={saveSlots}
          onSaveToSlot={(slotId) => handleSaveToSlot(slotId)}
          onLoadFromSlot={handleLoadFromSlot}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'SAVE_RECORD' && (
        <SaveLoadModal
          mode="save"
          slots={saveSlots}
          onSaveToSlot={(slotId) => {
            handleSaveToSlot(slotId);
            setActiveModal(null);
          }}
          onLoadFromSlot={handleLoadFromSlot}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'GALLERY' && (
        <GalleryModal
          items={galleryItems}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'SETTINGS' && (
        <SettingsModal
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            setSoundEnabled(!soundEnabled);
            soundManager.enabled = !soundEnabled;
          }}
          onResetData={handleResetData}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
