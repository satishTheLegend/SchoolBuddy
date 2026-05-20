// Shared application types. Mirrors the Postgres schema where useful.

export type Plan = 'free' | 'pro' | 'student';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  plan: Plan;
  streakCount: number;
  monthlyCaptures: number;
  fsrsParams: number[] | null;
}

export interface Deck {
  id: string;
  userId: string;
  title: string;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CaptureStatus =
  | 'pending'
  | 'extracting'
  | 'generating'
  | 'ready'
  | 'failed';

export interface Capture {
  id: string;
  userId: string;
  deckId: string | null;
  imageUrl: string | null;
  rawText: string | null;
  status: CaptureStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface Summary {
  id: string;
  captureId: string;
  content: string;
  viewMode: 'bullets' | 'paragraph';
}

export type CardType = 'basic' | 'cloze' | 'definition';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  deckId: string;
  captureId: string | null;
  userId: string;
  front: string;
  back: string;
  type: CardType;
  stability: number;
  difficulty: number;
  dueAt: string;
  lastReviewedAt: string | null;
  reps: number;
  lapses: number;
  state: CardState;
  suspended: boolean;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  captureId: string;
  userId: string;
  questions: QuizQuestion[];
  createdAt: string;
}
