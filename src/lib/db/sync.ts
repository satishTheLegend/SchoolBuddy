// Tiny sync engine. Two passes:
//   1. Pull: download cards and recent updates from Postgres into SQLite
//   2. Push: send dirty cards and queued reviews back up
//
// Last-write-wins on cards via updated_at. Reviews are append-only so
// they just need to be flushed.

import { supabase } from '../supabase';
import { getDb, upsertCard } from './client';
import { Card, CardState, CardType } from '@/types';

interface RemoteCardRow {
  id: string;
  deck_id: string;
  capture_id: string | null;
  user_id: string;
  front: string;
  back: string;
  type: CardType;
  stability: number;
  difficulty: number;
  due_at: string;
  last_reviewed_at: string | null;
  reps: number;
  lapses: number;
  state: CardState;
  suspended: boolean;
  starred: boolean;
  created_at: string;
  updated_at: string;
}

export async function pullCards(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw error;

  let count = 0;
  for (const row of (data ?? []) as RemoteCardRow[]) {
    const card: Card = {
      id: row.id,
      deckId: row.deck_id,
      captureId: row.capture_id,
      userId: row.user_id,
      front: row.front,
      back: row.back,
      type: row.type,
      stability: row.stability,
      difficulty: row.difficulty,
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      suspended: row.suspended,
      starred: row.starred,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    await upsertCard(card);
    count++;
  }
  return count;
}

export async function pushDirty(): Promise<number> {
  const db = getDb();
  // Dirty cards
  const dirtyCards = await db.getAllAsync<{
    id: string;
    stability: number;
    difficulty: number;
    due_at: string;
    last_reviewed_at: string | null;
    reps: number;
    lapses: number;
    state: string;
  }>(
    `SELECT id, stability, difficulty, due_at, last_reviewed_at, reps, lapses, state
     FROM cards WHERE dirty = 1`,
  );

  for (const c of dirtyCards) {
    const { error } = await supabase
      .from('cards')
      .update({
        stability: c.stability,
        difficulty: c.difficulty,
        due_at: c.due_at,
        last_reviewed_at: c.last_reviewed_at,
        reps: c.reps,
        lapses: c.lapses,
        state: c.state,
      })
      .eq('id', c.id);
    if (!error) {
      await db.runAsync(`UPDATE cards SET dirty = 0 WHERE id = ?`, [c.id]);
    }
  }

  // Unsynced reviews
  const unsynced = await db.getAllAsync<{
    id: string;
    card_id: string;
    rating: number;
    elapsed_days: number;
    stability_before: number;
    difficulty_before: number;
    stability_after: number;
    difficulty_after: number;
    reviewed_at: string;
  }>(
    `SELECT * FROM reviews_queue WHERE synced = 0 ORDER BY reviewed_at ASC LIMIT 500`,
  );

  if (unsynced.length) {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (userId) {
      // Send the local queue id as the remote PK so retries after a
      // partial failure don't insert duplicates.
      const rows = unsynced.map((r) => ({
        id: r.id,
        card_id: r.card_id,
        user_id: userId,
        rating: r.rating,
        elapsed_days: r.elapsed_days,
        stability_before: r.stability_before,
        difficulty_before: r.difficulty_before,
        stability_after: r.stability_after,
        difficulty_after: r.difficulty_after,
        reviewed_at: r.reviewed_at,
      }));
      const { error } = await supabase
        .from('reviews')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (!error) {
        for (const r of unsynced) {
          await db.runAsync(
            `UPDATE reviews_queue SET synced = 1 WHERE id = ?`,
            [r.id],
          );
        }
      }
    }
  }

  return dirtyCards.length + unsynced.length;
}

export async function fullSync(userId: string): Promise<void> {
  await pushDirty();
  await pullCards(userId);
}
