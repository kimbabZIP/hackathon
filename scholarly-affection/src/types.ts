export type Screen = 
  | 'TITLE'
  | 'SELECT_PROFESSOR'
  | 'CREATE_PROFESSOR'
  | 'INTERACTION'
  | 'DIALOGUE'
  | 'ASSIGNMENT_REVIEW'
  | 'LECTURE_MATERIALS'
  | 'LECTURE_VOICE'
  | 'LOAD_RECORD'
  | 'GALLERY'
  | 'SETTINGS';

export interface DialogueChoice {
  text: string;
  nextId?: string;
  affectionDelta: number;
  stressDelta: number;
  feedback: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  expression?: 'normal' | 'strict' | 'smile' | 'thoughtful' | 'surprised';
  affectionChange?: number;
  stressChange?: number;
  choices?: DialogueChoice[];
  nextId?: string;
}

export interface Professor {
  id: string;
  name: string;
  field: string;
  title: string;
  avatarUrl: string;
  spriteUrl: string;
  bgUrl: string;
  affection: number;
  stress: number;
  traits: string;
  voiceSampleName?: string;
  specialty: string;
  dialogues: DialogueNode[];
  customCreated?: boolean;
}

export type AssignmentInputMode = 'text' | 'file';

export interface AssignmentSourceInput {
  mode: AssignmentInputMode;
  text: string;
  file: File | null;
}

export interface AssignmentFeedbackInput {
  lecture: AssignmentSourceInput;
  assignment: AssignmentSourceInput;
  submission: AssignmentSourceInput;
}

export interface AssignmentFeedbackHealth {
  status: string;
  ai_enabled: boolean;
}

export interface FeedbackCriterion {
  name: string;
  score: number;
  max_score: number;
  feedback: string;
  evidence: string;
}

export interface FeedbackLineEdit {
  original: string;
  revised: string;
  reason: string;
}

export interface AssignmentFeedbackReport {
  title: string;
  total_score: number;
  grade: string;
  summary: string;
  criteria: FeedbackCriterion[];
  strengths: string[];
  priorities: string[];
  misconceptions: string[];
  line_edits: FeedbackLineEdit[];
  improved_example: string;
  engine: string;
  caution: string;
}

export type AssignmentGrade =
  | 'A+'
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C'
  | 'D'
  | 'F';

export interface AssignmentInputSnapshot {
  mode: AssignmentInputMode;
  fileName?: string;
  fileSize?: number;
  preview: string;
}

export interface AssignmentRecord {
  id: string;
  professorId: string;
  title: string;
  topic: string;
  content: string;
  grade: AssignmentGrade;
  score: number;
  summaryFeedback: string;
  annotations: { text: string; note: string; type: 'praise' | 'critique' | 'question' }[];
  timestamp: string;
  affectionGained: number;
  schemaVersion?: 2;
  inputSnapshots?: {
    lecture: AssignmentInputSnapshot;
    assignment: AssignmentInputSnapshot;
    submission: AssignmentInputSnapshot;
  };
  feedbackReport?: AssignmentFeedbackReport;
}

export interface LectureMaterial {
  id: string;
  professorId: string;
  title: string;
  fileName: string;
  fileSize: string;
  summary: string;
  keyQuestions: string[];
  professorComment: string;
  timestamp: string;
}

export interface LectureVoice {
  id: string;
  professorId: string;
  title: string;
  duration: string;
  transcriptSnippet: string;
  keyInsights: string[];
  professorReaction: string;
  timestamp: string;
}

export interface SaveSlot {
  slotId: number;
  isEmpty: boolean;
  professorId?: string;
  professorName?: string;
  avatarUrl?: string;
  screen?: Screen;
  currentDialogueId?: string;
  snippet?: string;
  timestamp?: string;
  affection?: number;
  stress?: number;
}

export interface GalleryItem {
  id: string;
  professorId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  unlocked: boolean;
  unlockCondition: string;
}
