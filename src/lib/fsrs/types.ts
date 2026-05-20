// FSRS v5 — Free Spaced Repetition Scheduler
// https://github.com/open-spaced-repetition

export const RATING = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const;

export type Rating = (typeof RATING)[keyof typeof RATING];

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface FsrsCard {
  stability: number;
  difficulty: number;
  due: Date;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  state: CardState;
}

export interface ReviewLog {
  rating: Rating;
  elapsedDays: number;
  stabilityBefore: number;
  difficultyBefore: number;
  stabilityAfter: number;
  difficultyAfter: number;
  reviewedAt: Date;
}

export interface FsrsParameters {
  w: readonly number[]; // 19 weights
  requestRetention: number; // target retention, default 0.9
  maximumInterval: number; // days, default 36500
}
