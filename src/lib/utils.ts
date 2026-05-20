// Misc helpers.

export function formatDueDelta(days: number): string {
  if (days < 1 / 60) return 'now';
  if (days < 1 / 24) return `${Math.round(days * 24 * 60)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

export function pluralize(n: number, single: string, plural?: string): string {
  return n === 1 ? single : (plural ?? `${single}s`);
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// Type-safe `assert`
export function assert(cond: unknown, msg = 'assertion failed'): asserts cond {
  if (!cond) throw new Error(msg);
}
