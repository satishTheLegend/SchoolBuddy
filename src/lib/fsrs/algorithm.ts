import {
  FsrsCard,
  FsrsParameters,
  Rating,
  RATING,
  ReviewLog,
} from './types';

// Default FSRS v5 weights (open-spaced-repetition canonical values).
export const DEFAULT_W: readonly number[] = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234,
  1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407,
  2.9466, 0.5034, 0.6567,
];

export const DEFAULT_PARAMETERS: FsrsParameters = {
  w: DEFAULT_W,
  requestRetention: 0.9,
  maximumInterval: 36500,
};

// FSRS v5 forgetting curve constants
const FACTOR = 19 / 81;
const DECAY = -0.5;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(Math.max(x, lo), hi);

// Retrievability after `elapsedDays` for a card of `stability`.
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

// Interval for a card of given stability to hit `requestRetention`.
export function nextInterval(
  stability: number,
  params: FsrsParameters,
): number {
  const r = params.requestRetention;
  const interval = (stability / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  return clamp(Math.round(interval), 1, params.maximumInterval);
}

// ----- initial card -----
function initStability(rating: Rating, w: readonly number[]): number {
  // First-review stability indexed by rating (1..4)
  return Math.max(w[rating - 1], 0.1);
}

function initDifficulty(rating: Rating, w: readonly number[]): number {
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10);
}

// ----- difficulty update -----
function nextDifficulty(
  difficulty: number,
  rating: Rating,
  w: readonly number[],
): number {
  const deltaD = -w[6] * (rating - 3);
  // Linear interpolation toward D_0(4) (mean reversion)
  const damped = difficulty + (deltaD * (10 - difficulty)) / 9;
  const meanRevert = w[7] * initDifficulty(RATING.Easy, w) + (1 - w[7]) * damped;
  return clamp(meanRevert, 1, 10);
}

// ----- stability update (successful recall) -----
function nextRecallStability(
  difficulty: number,
  stability: number,
  r: number,
  rating: Rating,
  w: readonly number[],
): number {
  const hardPenalty = rating === RATING.Hard ? w[15] : 1;
  const easyBonus = rating === RATING.Easy ? w[16] : 1;
  return (
    stability *
    (1 +
      Math.exp(w[8]) *
        (11 - difficulty) *
        Math.pow(stability, -w[9]) *
        (Math.exp(w[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
}

// ----- stability update (lapse) -----
function nextForgetStability(
  difficulty: number,
  stability: number,
  r: number,
  w: readonly number[],
): number {
  return (
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - r))
  );
}

// ----- public API -----

export function newCard(now: Date = new Date()): FsrsCard {
  return {
    stability: 0,
    difficulty: 0,
    due: now,
    lastReview: null,
    reps: 0,
    lapses: 0,
    state: 'new',
  };
}

export interface ReviewResult {
  card: FsrsCard;
  log: ReviewLog;
}

// Apply a review rating to a card and return updated state + log.
export function review(
  card: FsrsCard,
  rating: Rating,
  now: Date = new Date(),
  parameters: FsrsParameters = DEFAULT_PARAMETERS,
): ReviewResult {
  const w = parameters.w;
  const elapsedDays = card.lastReview
    ? Math.max(
        0,
        (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const stabilityBefore = card.stability;
  const difficultyBefore = card.difficulty;

  let stability: number;
  let difficulty: number;
  let lapses = card.lapses;
  let state: FsrsCard['state'];

  if (card.state === 'new') {
    stability = initStability(rating, w);
    difficulty = initDifficulty(rating, w);
    state = rating === RATING.Again ? 'learning' : 'review';
    if (rating === RATING.Again) lapses += 1;
  } else {
    const r = retrievability(elapsedDays, card.stability);
    difficulty = nextDifficulty(card.difficulty, rating, w);

    if (rating === RATING.Again) {
      // Forget — stability cannot exceed the prior value
      stability = Math.min(
        nextForgetStability(card.difficulty, card.stability, r, w),
        card.stability,
      );
      lapses += 1;
      state = 'relearning';
    } else {
      stability = nextRecallStability(
        card.difficulty,
        card.stability,
        r,
        rating,
        w,
      );
      state = 'review';
    }
  }

  const intervalDays =
    rating === RATING.Again
      ? // Short re-learning step: 10 minutes
        10 / (60 * 24)
      : nextInterval(stability, parameters);

  const due = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  const updated: FsrsCard = {
    stability,
    difficulty,
    due,
    lastReview: now,
    reps: card.reps + 1,
    lapses,
    state,
  };

  return {
    card: updated,
    log: {
      rating,
      elapsedDays,
      stabilityBefore,
      difficultyBefore,
      stabilityAfter: stability,
      difficultyAfter: difficulty,
      reviewedAt: now,
    },
  };
}

// Compute the projected next-due interval for each rating, in days.
// Useful for showing "Again 10m | Hard 1d | Good 3d | Easy 7d" labels.
export function previewIntervals(
  card: FsrsCard,
  now: Date = new Date(),
  parameters: FsrsParameters = DEFAULT_PARAMETERS,
): Record<Rating, number> {
  const result = {} as Record<Rating, number>;
  for (const rating of [RATING.Again, RATING.Hard, RATING.Good, RATING.Easy]) {
    const { card: next } = review(card, rating, now, parameters);
    result[rating] =
      (next.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  }
  return result;
}
