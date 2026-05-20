// Scoped pulls — narrow, fast, capture-aware fetches into the local
// SQLite mirror. The base sync engine in ./sync.ts pulls the user's
// full card set, which is fine for background refresh but too slow
// (and too coarse) to run immediately after a capture finishes.
//
// These helpers give the capture/review flow a targeted way to pull
// "just the cards I need right now" so the review screen sees the
// freshly generated cards without waiting on a full sync.
//
// Dirty-row rule (matches pushDirty in ./sync.ts):
//   - If a local row has dirty = 1, it has an unsynced local edit and
//     MUST NOT be overwritten — pushDirty will resolve it on the next
//     sync.
//   - If the local row's updated_at is newer than the remote row,
//     skip — last-write-wins.
//   - Otherwise, upsert the remote values.

import { supabase } from '../supabase';
import { getDb, upsertCard } from './client';
import {
  initCapturesTable,
  upsertCapture,
} from './local-captures';
import { Card, CardState, CardType, CaptureStatus } from '@/types';

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

interface LocalCardMeta {
  id: string;
  updated_at: string;
  dirty: number;
}

function rowToCard(row: RemoteCardRow): Card {
  return {
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
}

/**
 * Fetch all cards belonging to a single deck (scoped to the given
 * user) and merge them into the local SQLite mirror.
 *
 * Respects the dirty-row rule: rows with local edits are left alone,
 * and rows whose local `updated_at` is newer than the remote copy are
 * skipped.
 *
 * Returns the number of rows actually written locally.
 */
export async function pullDeckCards(
  userId: string,
  deckId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const remoteRows = (data ?? []) as RemoteCardRow[];
  if (remoteRows.length === 0) return 0;

  // Fetch local metadata for just these ids so we can apply the
  // dirty / updated_at rules without overwriting unsynced edits.
  const db = getDb();
  const ids = remoteRows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const localMeta = await db.getAllAsync<LocalCardMeta>(
    `SELECT id, updated_at, dirty FROM cards WHERE id IN (${placeholders})`,
    ids,
  );
  const localById = new Map<string, LocalCardMeta>(
    localMeta.map((m) => [m.id, m]),
  );

  let written = 0;
  for (const row of remoteRows) {
    const local = localById.get(row.id);
    if (local) {
      // Never trample an unsynced local edit.
      if (local.dirty === 1) continue;
      // Last-write-wins: skip if local is strictly newer.
      if (local.updated_at > row.updated_at) continue;
    }
    await upsertCard(rowToCard(row));
    written++;
  }
  return written;
}

interface RemoteCaptureRow {
  id: string;
  user_id: string;
  deck_id: string | null;
  raw_text: string | null;
  status: CaptureStatus;
  created_at: string;
}

/**
 * Pull the most recent N captures for a user into the local captures
 * mirror. Creates the mirror table if needed.
 */
export async function pullCapturesForUser(
  userId: string,
  limit: number,
): Promise<void> {
  await initCapturesTable();

  const { data, error } = await supabase
    .from('captures')
    .select('id, user_id, deck_id, raw_text, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  for (const row of (data ?? []) as RemoteCaptureRow[]) {
    await upsertCapture({
      id: row.id,
      userId: row.user_id,
      deckId: row.deck_id,
      rawText: row.raw_text,
      status: row.status,
      createdAt: row.created_at,
    });
  }
}

/**
 * Combined freshness helper used by the review store right before
 * loading the queue. If `deckId` is provided, scope the pull to that
 * deck; otherwise fall back to pulling every card the user owns so
 * cross-deck review ("Today" / "all") still sees fresh content.
 *
 * This intentionally does NOT push dirty rows — that is the job of
 * the base sync engine. Push then pull would defeat the point of
 * being snappy after a capture.
 */
export async function ensureFreshCards(
  userId: string,
  deckId: string | null,
): Promise<void> {
  if (deckId) {
    await pullDeckCards(userId, deckId);
    return;
  }
  // Cross-deck case: pull everything (still respecting dirty rows).
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const remoteRows = (data ?? []) as RemoteCardRow[];
  if (remoteRows.length === 0) return;

  const db = getDb();
  const ids = remoteRows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const localMeta = await db.getAllAsync<LocalCardMeta>(
    `SELECT id, updated_at, dirty FROM cards WHERE id IN (${placeholders})`,
    ids,
  );
  const localById = new Map<string, LocalCardMeta>(
    localMeta.map((m) => [m.id, m]),
  );

  for (const row of remoteRows) {
    const local = localById.get(row.id);
    if (local) {
      if (local.dirty === 1) continue;
      if (local.updated_at > row.updated_at) continue;
    }
    await upsertCard(rowToCard(row));
  }
}
