// Streak tracker — client-side counterpart to users.streak_count in Postgres.
//
// Why SecureStore (vs. extending SQLite): the streak is a single tiny
// {count, lastReviewDate, freezeDate} record. The SQLite schema in
// src/lib/db/client.ts is shaped around per-card/per-review rows; adding a
// "kv" table for one record is more ceremony than the simple solution. We
// keep this aligned with src/lib/onboarding.ts — small device-local state
// belongs in expo-secure-store.
//
// Semantics (matches PROJECT_PLAN.md §9.4 "streaks but not toxic"):
//   - recordReviewToday() bumps the streak by 1 on a *consecutive* day,
//   - leaves it unchanged on a same-day re-review (idempotent),
//   - resets to 1 if there was a gap of > 1 calendar day,
//   - freezeToday() shields the streak for a single day (sickness/travel):
//     a single-day gap that contains a freeze is treated as consecutive.
//
// Dates are stored as YYYY-MM-DD in the *device's local* calendar — streaks
// are a UX concept, not an audit log, so local time is the right frame.

import * as SecureStore from 'expo-secure-store';

const STREAK_KEY = 'snapstudy.streak.v1';

export interface Streak {
  count: number;
  lastReviewDate: string | null; // YYYY-MM-DD or null
}

interface StoredStreak extends Streak {
  freezeDate: string | null; // YYYY-MM-DD or null — the day being shielded
}

const EMPTY: StoredStreak = {
  count: 0,
  lastReviewDate: null,
  freezeDate: null,
};

function todayISODate(d: Date = new Date()): string {
  // Local-calendar YYYY-MM-DD (avoid toISOString's UTC shift).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayISODate(dt);
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86_400_000);
}

async function loadStored(): Promise<StoredStreak> {
  try {
    const raw = await SecureStore.getItemAsync(STREAK_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StoredStreak>;
    return {
      count:
        typeof parsed.count === 'number' && parsed.count >= 0
          ? Math.floor(parsed.count)
          : 0,
      lastReviewDate:
        typeof parsed.lastReviewDate === 'string'
          ? parsed.lastReviewDate
          : null,
      freezeDate:
        typeof parsed.freezeDate === 'string' ? parsed.freezeDate : null,
    };
  } catch (e) {
    console.warn('[streak] loadStored failed', e);
    return { ...EMPTY };
  }
}

async function saveStored(s: StoredStreak): Promise<void> {
  try {
    await SecureStore.setItemAsync(STREAK_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('[streak] saveStored failed', e);
  }
}

/**
 * Read the current streak. Does not mutate.
 * The returned `lastReviewDate` is local YYYY-MM-DD (or null if never).
 */
export async function getStreak(): Promise<Streak> {
  const s = await loadStored();
  return { count: s.count, lastReviewDate: s.lastReviewDate };
}

/**
 * Call after a successful review to update the streak. Idempotent within a
 * single calendar day (re-reviewing later the same day does not bump).
 *
 * Returns the new streak and a `bumped` flag indicating whether this call
 * actually incremented the counter (useful for celebratory UI).
 */
export async function recordReviewToday(): Promise<{
  count: number;
  bumped: boolean;
}> {
  const stored = await loadStored();
  const today = todayISODate();

  // First-ever review.
  if (!stored.lastReviewDate) {
    const next: StoredStreak = {
      count: 1,
      lastReviewDate: today,
      freezeDate: stored.freezeDate,
    };
    await saveStored(next);
    return { count: 1, bumped: true };
  }

  // Same calendar day → no-op.
  if (stored.lastReviewDate === today) {
    return { count: stored.count, bumped: false };
  }

  const gap = daysBetween(stored.lastReviewDate, today);

  // Defensive: if the system clock moved backward, treat it as same-day.
  if (gap <= 0) {
    return { count: stored.count, bumped: false };
  }

  // Consecutive day → bump.
  if (gap === 1) {
    const next: StoredStreak = {
      count: stored.count + 1,
      lastReviewDate: today,
      freezeDate: stored.freezeDate,
    };
    await saveStored(next);
    return { count: next.count, bumped: true };
  }

  // Exactly one day missed, but a freeze covers that day → bump and consume
  // the freeze.
  const missedDay = addDays(stored.lastReviewDate, 1);
  if (gap === 2 && stored.freezeDate === missedDay) {
    const next: StoredStreak = {
      count: stored.count + 1,
      lastReviewDate: today,
      freezeDate: null,
    };
    await saveStored(next);
    return { count: next.count, bumped: true };
  }

  // Gap of 2+ days, no freeze → streak resets to 1 (today counts).
  const next: StoredStreak = {
    count: 1,
    lastReviewDate: today,
    freezeDate: null,
  };
  await saveStored(next);
  return { count: 1, bumped: true };
}

/**
 * Shield today from breaking the streak (sickness/travel/etc.).
 * The freeze is consumed on the next successful review; if the user does
 * review today anyway, the freeze remains stored but harmless until needed.
 *
 * Only one freeze can be held at a time — calling repeatedly just overwrites
 * the stored date.
 */
export async function freezeToday(): Promise<void> {
  const stored = await loadStored();
  const today = todayISODate();
  const next: StoredStreak = { ...stored, freezeDate: today };
  await saveStored(next);
}
