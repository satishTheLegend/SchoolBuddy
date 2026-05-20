import { create } from 'zustand';
import { Card } from '@/types';
import { getDueCards, recordReview, upsertCard } from '@/lib/db/client';
import {
  DEFAULT_PARAMETERS,
  FsrsCard,
  Rating,
  review as fsrsReview,
} from '@/lib/fsrs';

interface ReviewState {
  queue: Card[];
  current: Card | null;
  revealed: boolean;
  completed: number;
  loading: boolean;
  load: (userId: string, deckId: string | null) => Promise<void>;
  reveal: () => void;
  rate: (rating: Rating) => Promise<void>;
  reset: () => void;
}

function toFsrs(card: Card): FsrsCard {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    due: new Date(card.dueAt),
    lastReview: card.lastReviewedAt ? new Date(card.lastReviewedAt) : null,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };
}

export const useReview = create<ReviewState>((set, get) => ({
  queue: [],
  current: null,
  revealed: false,
  completed: 0,
  loading: false,

  load: async (userId, deckId) => {
    set({ loading: true });
    const cards = await getDueCards(userId, deckId, 200);
    set({
      queue: cards.slice(1),
      current: cards[0] ?? null,
      revealed: false,
      completed: 0,
      loading: false,
    });
  },

  reveal: () => set({ revealed: true }),

  rate: async (rating) => {
    const { current, queue, completed } = get();
    if (!current) return;

    const fsrs = toFsrs(current);
    const now = new Date();
    const { card: nextFsrs, log } = fsrsReview(fsrs, rating, now, DEFAULT_PARAMETERS);

    const updated: Card = {
      ...current,
      stability: nextFsrs.stability,
      difficulty: nextFsrs.difficulty,
      dueAt: nextFsrs.due.toISOString(),
      lastReviewedAt: nextFsrs.lastReview!.toISOString(),
      reps: nextFsrs.reps,
      lapses: nextFsrs.lapses,
      state: nextFsrs.state,
      updatedAt: now.toISOString(),
    };

    await upsertCard(updated, true);
    await recordReview({
      cardId: current.id,
      rating,
      elapsedDays: log.elapsedDays,
      stabilityBefore: log.stabilityBefore,
      difficultyBefore: log.difficultyBefore,
      stabilityAfter: log.stabilityAfter,
      difficultyAfter: log.difficultyAfter,
      reviewedAt: now.toISOString(),
    });

    // For lapses, put the card back at the end of the queue for re-learning.
    const nextQueue =
      rating === 1 ? [...queue, updated] : queue;

    set({
      queue: nextQueue.slice(1),
      current: nextQueue[0] ?? null,
      revealed: false,
      completed: completed + 1,
    });
  },

  reset: () =>
    set({
      queue: [],
      current: null,
      revealed: false,
      completed: 0,
      loading: false,
    }),
}));
