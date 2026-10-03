export const SUBJECTS = ['Auto Detect', 'Science', 'Mathematics', 'English', 'Hindi', 'Punjabi', 'Social Science', 'Computer', 'General'] as const;
export const GRADES = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Other'] as const;
export const LANGUAGES = ['English', 'Hindi', 'Punjabi', 'Hinglish'] as const;
export const LENGTHS = ['Very Short', 'Short', 'Medium', 'Detailed', 'Exam Ready'] as const;
export const PAPERS = ['Ruled', 'Plain', 'Graph', 'Exam Sheet'] as const;
export const INKS = ['Blue', 'Black'] as const;
export const PAGE_SIZES = ['A4', 'A5', 'Notebook'] as const;
export const WRITINGS = ['Match Reference', 'Natural', 'Neat', 'Slightly Casual'] as const;
export const SPACINGS = ['Compact', 'Normal', 'Wide'] as const;
export const MARGINS = ['Normal', 'Wide', 'Narrow'] as const;

export type Subject = (typeof SUBJECTS)[number];
export type Grade = (typeof GRADES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Length = (typeof LENGTHS)[number];
export type Paper = (typeof PAPERS)[number];
export type Ink = (typeof INKS)[number];
export type PageSize = (typeof PAGE_SIZES)[number];
export type Writing = (typeof WRITINGS)[number];
export type Spacing = (typeof SPACINGS)[number];
export type Margin = (typeof MARGINS)[number];

export interface StyleProfile {
  slant: number; // degrees, + leans right
  size: number; // 1 = default
  thickness: number; // 1 = default
  spacing: number; // 1 = default
  wobble: number; // 1 = default irregularity
  notes?: string;
}
export const DEFAULT_STYLE: StyleProfile = { slant: 6, size: 1, thickness: 1, spacing: 1, wobble: 1 };

export interface NotebookSettings {
  paper: Paper; ink: Ink; pageSize: PageSize; writing: Writing; lineSpacing: Spacing; margin: Margin;
}
export interface AnswerSettings {
  subject: Subject; grade: Grade; language: Language; length: Length;
}
export interface AppSettings extends AnswerSettings {
  theme: 'light' | 'dark' | 'system';
  autoSend: boolean;
  autoNotebook: boolean;
  voiceLang: 'English' | 'Hindi' | 'Punjabi';
  notebook: NotebookSettings;
}
export const DEFAULT_SETTINGS: AppSettings = {
  subject: 'Auto Detect', grade: 'Class 8', language: 'English', length: 'Exam Ready',
  theme: 'system', autoSend: false, autoNotebook: false, voiceLang: 'English',
  notebook: { paper: 'Ruled', ink: 'Blue', pageSize: 'A4', writing: 'Natural', lineSpacing: 'Normal', margin: 'Normal' },
};

export interface Turn {
  id: string; question: string; answer: string; instructions: string;
  subject: Subject; grade: Grade; language: Language; length: Length;
  createdAt: number; pages: string[]; seed: number;
}
export interface Chat { id: string; title: string; createdAt: number; turns: Turn[] }
export interface SavedPage { id: string; title: string; subject: string; createdAt: number; thumb: string; pages: string[] }
export interface Handwriting { image: string; style: StyleProfile }
