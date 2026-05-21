// Local SQLite mirror — drives the offline review experience.
// We keep a thin mirror of the user's cards + reviews so the FSRS
// scheduler runs without network. Sync to Postgres happens in the
// background; conflicts resolve last-write-wins on per-card basis.

import * as SQLite from 'expo-sqlite';
import { Card, CardState, CardType } from '@/types';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('snapstudy.db');
  return _db;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7C5CFF',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      deck_id TEXT NOT NULL,
      capture_id TEXT,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'basic',
      stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0,
      due_at TEXT NOT NULL,
      last_reviewed_at TEXT,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'new',
      suspended INTEGER NOT NULL DEFAULT 0,
      starred INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS cards_deck_idx ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS cards_user_idx ON cards(user_id);
    CREATE INDEX IF NOT EXISTS cards_due_idx ON cards(due_at) WHERE suspended = 0;

    CREATE TABLE IF NOT EXISTS reviews_queue (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      elapsed_days REAL NOT NULL,
      stability_before REAL NOT NULL,
      difficulty_before REAL NOT NULL,
      stability_after REAL NOT NULL,
      difficulty_after REAL NOT NULL,
      reviewed_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);
}

interface CardRow {
  id: string;
  deck_id: string;
  capture_id: string | null;
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
  suspended: number;
  starred: number;
  created_at: string;
  updated_at: string;
}

function rowToCard(r: CardRow, userId: string): Card {
  return {
    id: r.id,
    deckId: r.deck_id,
    captureId: r.capture_id,
    userId,
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

export async function getDueCards(
  userId: string,
  deckId: string | null,
  limit = 100,
): Promise<Card[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const sql = deckId
    ? `SELECT * FROM cards WHERE user_id = ? AND deck_id = ? AND due_at <= ? AND suspended = 0
       ORDER BY due_at ASC LIMIT ?`
    : `SELECT * FROM cards WHERE user_id = ? AND due_at <= ? AND suspended = 0
       ORDER BY due_at ASC LIMIT ?`;
  const args = deckId ? [userId, deckId, now, limit] : [userId, now, limit];
  const rows = await db.getAllAsync<CardRow>(sql, args);
  return rows.map((r) => rowToCard(r, userId));
}

export async function getDeckCards(
  userId: string,
  deckId: string,
): Promise<Card[]> {
  const db = getDb();
  const rows = await db.getAllAsync<CardRow>(
    `SELECT * FROM cards WHERE user_id = ? AND deck_id = ? ORDER BY created_at DESC`,
    [userId, deckId],
  );
  return rows.map((r) => rowToCard(r, userId));
}

export async function countDue(
  userId: string,
  deckId: string | null,
): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = deckId
    ? await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM cards WHERE user_id = ? AND deck_id = ? AND due_at <= ? AND suspended = 0`,
        [userId, deckId, now],
      )
    : await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM cards WHERE user_id = ? AND due_at <= ? AND suspended = 0`,
        [userId, now],
      );
  return row?.n ?? 0;
}

export async function upsertCard(card: Card, markDirty = false): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO cards (
      id, user_id, deck_id, capture_id, front, back, type,
      stability, difficulty, due_at, last_reviewed_at,
      reps, lapses, state, suspended, starred,
      created_at, updated_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id=excluded.user_id,
      deck_id=excluded.deck_id,
      front=excluded.front,
      back=excluded.back,
      stability=excluded.stability,
      difficulty=excluded.difficulty,
      due_at=excluded.due_at,
      last_reviewed_at=excluded.last_reviewed_at,
      reps=excluded.reps,
      lapses=excluded.lapses,
      state=excluded.state,
      suspended=excluded.suspended,
      starred=excluded.starred,
      updated_at=excluded.updated_at,
      dirty=MAX(cards.dirty, excluded.dirty)`,
    [
      card.id,
      card.userId,
      card.deckId,
      card.captureId,
      card.front,
      card.back,
      card.type,
      card.stability,
      card.difficulty,
      card.dueAt,
      card.lastReviewedAt,
      card.reps,
      card.lapses,
      card.state,
      card.suspended ? 1 : 0,
      card.starred ? 1 : 0,
      card.createdAt,
      card.updatedAt,
      markDirty ? 1 : 0,
    ],
  );
}

export async function recordReview(args: {
  cardId: string;
  rating: number;
  elapsedDays: number;
  stabilityBefore: number;
  difficultyBefore: number;
  stabilityAfter: number;
  difficultyAfter: number;
  reviewedAt: string;
}): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO reviews_queue (
      id, card_id, rating, elapsed_days,
      stability_before, difficulty_before,
      stability_after, difficulty_after,
      reviewed_at, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      cryptoRandomId(),
      args.cardId,
      args.rating,
      args.elapsedDays,
      args.stabilityBefore,
      args.difficultyBefore,
      args.stabilityAfter,
      args.difficultyAfter,
      args.reviewedAt,
    ],
  );
}

function cryptoRandomId(): string {
  // Lightweight UUIDv4. expo-crypto would be the dependency-free path
  // but for offline-queue identity we can keep this minimal.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export { cryptoRandomId };
