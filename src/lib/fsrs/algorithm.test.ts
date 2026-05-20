import {
  DEFAULT_PARAMETERS,
  newCard,
  nextInterval,
  previewIntervals,
  RATING,
  retrievability,
  review,
} from './';

describe('FSRS algorithm', () => {
  it('new card starts in `new` state with no stability', () => {
    const c = newCard();
    expect(c.state).toBe('new');
    expect(c.stability).toBe(0);
    expect(c.reps).toBe(0);
  });

  it('first Good review puts the card into review state with positive stability', () => {
    const card = newCard(new Date('2026-01-01T00:00:00Z'));
    const { card: next, log } = review(
      card,
      RATING.Good,
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(next.state).toBe('review');
    expect(next.stability).toBeGreaterThan(0);
    expect(next.difficulty).toBeGreaterThan(1);
    expect(next.difficulty).toBeLessThan(10);
    expect(next.reps).toBe(1);
    expect(log.rating).toBe(RATING.Good);
  });

  it('first Again review puts the card into learning state and increments lapses', () => {
    const card = newCard();
    const { card: next } = review(card, RATING.Again);
    expect(next.state).toBe('learning');
    expect(next.lapses).toBe(1);
  });

  it('Easy yields a longer interval than Good than Hard', () => {
    const card = newCard(new Date('2026-01-01T00:00:00Z'));
    const hard = review(card, RATING.Hard, new Date('2026-01-01T00:00:00Z'));
    const good = review(card, RATING.Good, new Date('2026-01-01T00:00:00Z'));
    const easy = review(card, RATING.Easy, new Date('2026-01-01T00:00:00Z'));
    expect(hard.card.stability).toBeLessThan(good.card.stability);
    expect(good.card.stability).toBeLessThan(easy.card.stability);
  });

  it('retrievability decreases with elapsed time', () => {
    const s = 10;
    expect(retrievability(0, s)).toBeCloseTo(1, 5);
    expect(retrievability(10, s)).toBeGreaterThan(retrievability(30, s));
    expect(retrievability(100, s)).toBeLessThan(0.5);
  });

  it('interval increases with stability', () => {
    const i1 = nextInterval(2, DEFAULT_PARAMETERS);
    const i10 = nextInterval(20, DEFAULT_PARAMETERS);
    expect(i10).toBeGreaterThan(i1);
  });

  it('Again on a learned card cannot increase stability', () => {
    const card = newCard(new Date('2026-01-01T00:00:00Z'));
    const learned = review(
      card,
      RATING.Good,
      new Date('2026-01-01T00:00:00Z'),
    ).card;
    const lapsed = review(
      learned,
      RATING.Again,
      new Date('2026-01-15T00:00:00Z'),
    ).card;
    expect(lapsed.stability).toBeLessThanOrEqual(learned.stability);
    expect(lapsed.state).toBe('relearning');
    expect(lapsed.lapses).toBe(1);
  });

  it('previewIntervals returns positive days for all ratings', () => {
    const card = newCard();
    const intervals = previewIntervals(card);
    expect(intervals[RATING.Again]).toBeGreaterThan(0);
    expect(intervals[RATING.Hard]).toBeGreaterThan(0);
    expect(intervals[RATING.Good]).toBeGreaterThan(0);
    expect(intervals[RATING.Easy]).toBeGreaterThan(0);
    expect(intervals[RATING.Easy]).toBeGreaterThan(intervals[RATING.Hard]);
  });

  it('a Good->Good->Good progression increases due date each step', () => {
    let card = newCard(new Date('2026-01-01T00:00:00Z'));
    let now = new Date('2026-01-01T00:00:00Z');
    const dues: number[] = [];
    for (let i = 0; i < 5; i++) {
      const result = review(card, RATING.Good, now);
      card = result.card;
      now = new Date(card.due.getTime());
      dues.push(card.due.getTime());
    }
    for (let i = 1; i < dues.length; i++) {
      expect(dues[i]).toBeGreaterThan(dues[i - 1]);
    }
  });
});
