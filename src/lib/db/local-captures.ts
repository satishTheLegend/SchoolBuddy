// Local SQLite mirror for captures. Mirrors a thin subset of the
// `captures` table in Postgres so the Today feed (and other surfaces
// that want recent capture history) can render without round-tripping
// through the network.
//
// This module owns the `captures` local table: schema, init, and
// read/write helpers. It is intentionally decoupled from
// ./client.ts so the existing initDb path doesn't have to change.

import { getDb } from './client';
import { Capture, CaptureStatus } from '@/types';

/**
 * Creates the local `captures` mirror table if it does not already
 * exist. Safe to call multiple times — IF NOT EXISTS guards the
 * statement so this can run from initDb or be called directly when a
 * scoped pull first needs the table.
 */
export async function initCapturesTable(): Promise<void> {
  const db = getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      deck_id TEXT,
      raw_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS captures_user_idx ON captures(user_id);
    CREATE INDEX IF NOT EXISTS captures_created_idx ON captures(created_at DESC);
  `);
}

interface CaptureRow {
  id: string;
  user_id: string;
  deck_id: string | null;
  raw_text: string | null;
  status: CaptureStatus;
  created_at: string;
}

function rowToCapture(r: CaptureRow): Capture {
  return {
    id: r.id,
    userId: r.user_id,
    deckId: r.deck_id,
    imageUrl: null,
    rawText: r.raw_text,
    status: r.status,
    errorMessage: null,
    createdAt: r.created_at,
  };
}

/**
 * Read the N most recent captures for a user from the local mirror.
 * Ordered newest-first.
 */
export async function getRecentCaptures(
  userId: string,
  limit = 20,
): Promise<Capture[]> {
  await initCapturesTable();
  const db = getDb();
  const rows = await db.getAllAsync<CaptureRow>(
    `SELECT id, user_id, deck_id, raw_text, status, created_at
     FROM captures
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit],
  );
  return rows.map(rowToCapture);
}

/**
 * Insert or update a capture in the local mirror. Last-write-wins on
 * the fields we mirror (status, raw_text, deck_id) — captures are
 * source-of-truth in Postgres, the mirror is read-mostly.
 */
export async function upsertCapture(capture: {
  id: string;
  userId: string;
  deckId: string | null;
  rawText: string | null;
  status: CaptureStatus;
  createdAt: string;
}): Promise<void> {
  await initCapturesTable();
  const db = getDb();
  await db.runAsync(
    `INSERT INTO captures (id, user_id, deck_id, raw_text, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       deck_id=excluded.deck_id,
       raw_text=excluded.raw_text,
       status=excluded.status`,
    [
      capture.id,
      capture.userId,
      capture.deckId,
      capture.rawText,
      capture.status,
      capture.createdAt,
    ],
  );
}
