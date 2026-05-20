// Card mutation helpers. Every operation writes to BOTH the local SQLite
// mirror (marking the row dirty for sync) and Postgres via supabase-js.
// Local writes happen first so the UI stays snappy offline; the remote
// call still runs so the change is durable. If the remote write fails the
// dirty flag ensures a later sync pass will retry.

import { supabase } from '@/lib/supabase';
import { getDb, upsertCard } from '@/lib/db/client';
import { Card } from '@/types';

interface CardRow {
  id: string;
  deck_id: string;
  capture_id: string | null;
  front: string;
  back: string;
  type: Card['type'];
  stability: number;
  difficulty: number;
  due_at: string;
  last_reviewed_at: string | null;
  reps: number;
  lapses: number;
  state: Card['state'];
  suspended: number;
  starred: number;
  created_at: string;
  updated_at: string;
}

async function loadLocalCard(cardId: string): Promise<CardRow | null> {
  const db = getDb();
  const row = await db.getFirstAsync<CardRow>(
    `SELECT * FROM cards WHERE id = ?`,
    [cardId],
  );
  return row ?? null;
}

function rowToCard(r: CardRow): Omit<Card, 'userId'> {
  return {
    id: r.id,
    deckId: r.deck_id,
    captureId: r.capture_id,
    front: r.front,
    back: r.back,
    type: r.type,
    stability: r.stability,
    difficulty: r.difficulty,
    dueAt: r.due_at,
    lastReviewedAt: r.last_reviewed_at,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state,
    suspended: r.suspended === 1,
    starred: r.starred === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function toggleStar(cardId: string, starred: boolean): Promise<void> {
  const row = await loadLocalCard(cardId);
  if (!row) throw new Error(`Card ${cardId} not found locally`);
  const updatedAt = new Date().toISOString();
  const next: Card = {
    ...rowToCard(row),
    userId: '',
    starred,
    updatedAt,
  };
  await upsertCard(next, true);

  const { error } = await supabase
    .from('cards')
    .update({ starred, updated_at: updatedAt })
    .eq('id', cardId);
  if (error) throw error;
}

export async function toggleSuspend(cardId: string, suspended: boolean): Promise<void> {
  const row = await loadLocalCard(cardId);
  if (!row) throw new Error(`Card ${cardId} not found locally`);
  const updatedAt = new Date().toISOString();
  const next: Card = {
    ...rowToCard(row),
    userId: '',
    suspended,
    updatedAt,
  };
  await upsertCard(next, true);

  const { error } = await supabase
    .from('cards')
    .update({ suspended, updated_at: updatedAt })
    .eq('id', cardId);
  if (error) throw error;
}

export async function updateCard(
  cardId: string,
  front: string,
  back: string,
): Promise<void> {
  const row = await loadLocalCard(cardId);
  if (!row) throw new Error(`Card ${cardId} not found locally`);
  const updatedAt = new Date().toISOString();
  const next: Card = {
    ...rowToCard(row),
    userId: '',
    front,
    back,
    updatedAt,
  };
  await upsertCard(next, true);

  const { error } = await supabase
    .from('cards')
    .update({ front, back, updated_at: updatedAt })
    .eq('id', cardId);
  if (error) throw error;
}

export async function deleteCard(cardId: string): Promise<void> {
  const db = getDb();
  await db.runAsync(`DELETE FROM cards WHERE id = ?`, [cardId]);

  const { error } = await supabase.from('cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function resetCardProgress(cardId: string): Promise<void> {
  const row = await loadLocalCard(cardId);
  if (!row) throw new Error(`Card ${cardId} not found locally`);
  const now = new Date().toISOString();
  const next: Card = {
    ...rowToCard(row),
    userId: '',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    dueAt: now,
    lastReviewedAt: null,
    updatedAt: now,
  };
  await upsertCard(next, true);

  const { error } = await supabase
    .from('cards')
    .update({
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      state: 'new',
      due_at: now,
      last_reviewed_at: null,
      updated_at: now,
    })
    .eq('id', cardId);
  if (error) throw error;
}
