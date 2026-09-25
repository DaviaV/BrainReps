import { describe, expect, it } from 'vitest';
import type { AttemptResult, Family, SessionRecord } from '../engine/types.ts';
import {
  clearProgress,
  completeSession,
  effectiveStreak,
  emptyProgress,
  isDoneFor,
  loadProgress,
  migrate,
  saveProgress,
  STORAGE_KEY,
  updateStreak,
} from './progress.ts';
import type { Progress, StorageLike } from './progress.ts';

/** An in-memory stand-in for localStorage, with optional failure injection. */
function fakeStore(initial?: string, mode: 'ok' | 'throwOnRead' | 'throwOnWrite' = 'ok') {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  const store: StorageLike = {
    getItem(key) {
      if (mode === 'throwOnRead') throw new Error('storage blocked');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      if (mode === 'throwOnWrite') throw new Error('quota exceeded');
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
  return { store, data };
}

const TARGET = 10_000;

function attempt(family: Family, correct: boolean, ms = TARGET / 2): AttemptResult {
  return {
    kind: family === 'math' ? 'arithmetic' : 'digit-span',
    family,
    level: 5,
    question: 'q',
    expected: 'a',
    given: correct ? 'a' : 'b',
    correct,
    ms,
    targetMs: TARGET,
  };
}

function session(date: string, correct = 5): SessionRecord {
  const results: AttemptResult[] = [];
  for (let i = 0; i < 3; i += 1) results.push(attempt('math', i < Math.min(correct, 3)));
  for (let i = 0; i < 2; i += 1) results.push(attempt('memory', 3 + i < correct));
  return { date, levelsAtStart: { math: 5, memory: 5 }, results, completed: false };
}

describe('load and save', () => {
  it('starts fresh when storage is empty', () => {
    const { store } = fakeStore();
    expect(loadProgress(store)).toEqual(emptyProgress());
  });

  it('round-trips a saved progress record', () => {
    const { store } = fakeStore();
    const progress: Progress = { ...emptyProgress(), levels: { math: 6, memory: 3 } };
    saveProgress(progress, store);
    expect(loadProgress(store)).toEqual(progress);
  });

  it('starts fresh rather than throwing on unparseable data', () => {
    const { store } = fakeStore('{not json at all');
    expect(loadProgress(store)).toEqual(emptyProgress());
  });

  it('survives storage that throws on read', () => {
    const { store } = fakeStore(undefined, 'throwOnRead');
    expect(loadProgress(store)).toEqual(emptyProgress());
  });

  it('swallows a failing write rather than crashing', () => {
    const { store } = fakeStore(undefined, 'throwOnWrite');
    expect(() => saveProgress(emptyProgress(), store)).not.toThrow();
  });

  it('works with no storage at all', () => {
    expect(loadProgress(null)).toEqual(emptyProgress());
    expect(() => saveProgress(emptyProgress(), null)).not.toThrow();
    expect(() => clearProgress(null)).not.toThrow();
  });

  it('clears stored progress', () => {
    const { store, data } = fakeStore();
    saveProgress({ ...emptyProgress(), levels: { math: 7, memory: 7 } }, store);
    clearProgress(store);
    expect(data.has(STORAGE_KEY)).toBe(false);
    expect(loadProgress(store)).toEqual(emptyProgress());
  });
});

describe('migrate', () => {
  it('rejects non-objects', () => {
    for (const input of [null, undefined, 42, 'x', [], true]) {
      expect(migrate(input)).toEqual(emptyProgress());
    }
  });

  it('clamps levels that are out of range or nonsense', () => {
    expect(migrate({ levels: { math: 99, memory: -5 } }).levels).toEqual({ math: 10, memory: 1 });
    expect(migrate({ levels: { math: 'six', memory: null } }).levels).toEqual({
      math: 1,
      memory: 1,
    });
    expect(migrate({ levels: { math: Number.NaN } }).levels.math).toBe(1);
  });

  it('drops malformed sessions but keeps good ones', () => {
    const result = migrate({
      sessions: [
        session('2026-09-24'),
        { date: 'not-a-date', results: [] },
        { date: '2026-09-25' },
        null,
        session('2026-09-26'),
      ],
    });
    expect(result.sessions.map((entry) => entry.date)).toEqual(['2026-09-24', '2026-09-26']);
  });

  it('drops malformed attempts inside an otherwise valid session', () => {
    const result = migrate({
      sessions: [
        {
          date: '2026-09-25',
          levelsAtStart: { math: 5, memory: 5 },
          completed: true,
          results: [attempt('math', true), { kind: 'arithmetic' }, { family: 'nope' }, 7],
        },
      ],
    });
    expect(result.sessions[0]?.results).toHaveLength(1);
  });

  it('starts fresh on a schema from the future', () => {
    const future = { schema: 99, levels: { math: 8, memory: 8 } };
    expect(migrate(future)).toEqual(emptyProgress());
  });

  it('defaults a missing streak and rejects a malformed one', () => {
    expect(migrate({}).streak).toEqual({ current: 0, best: 0, lastCompletedDate: null });
    expect(migrate({ streak: { current: -3, best: 'many', lastCompletedDate: 'soon' } }).streak)
      .toEqual({ current: 0, best: 0, lastCompletedDate: null });
  });

  it('keeps a valid streak', () => {
    const streak = { current: 4, best: 9, lastCompletedDate: '2026-09-25' };
    expect(migrate({ streak }).streak).toEqual(streak);
  });

  it('never throws, whatever it is handed', () => {
    const nasty = [
      { sessions: 'not an array' },
      { sessions: [{ date: '2026-09-25', results: 'nope' }] },
      { inFlight: 12 },
      { levels: [] },
      { streak: [] },
    ];
    for (const input of nasty) {
      expect(() => migrate(input)).not.toThrow();
    }
  });
});

describe('updateStreak', () => {
  it('starts a streak at one', () => {
    const streak = updateStreak({ current: 0, best: 0, lastCompletedDate: null }, '2026-09-25');
    expect(streak).toEqual({ current: 1, best: 1, lastCompletedDate: '2026-09-25' });
  });

  it('extends across consecutive days', () => {
    const streak = updateStreak(
      { current: 3, best: 3, lastCompletedDate: '2026-09-24' },
      '2026-09-25',
    );
    expect(streak.current).toBe(4);
    expect(streak.best).toBe(4);
  });

  it('resets after a missed day but keeps the best', () => {
    const streak = updateStreak(
      { current: 7, best: 7, lastCompletedDate: '2026-09-22' },
      '2026-09-25',
    );
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(7);
  });

  it('does not double-count the same day', () => {
    const existing = { current: 3, best: 5, lastCompletedDate: '2026-09-25' };
    expect(updateStreak(existing, '2026-09-25')).toEqual(existing);
  });

  it('carries across a month boundary', () => {
    const streak = updateStreak(
      { current: 2, best: 2, lastCompletedDate: '2026-09-30' },
      '2026-10-01',
    );
    expect(streak.current).toBe(3);
  });
});

describe('effectiveStreak', () => {
  it('shows the stored count when today or yesterday counted', () => {
    const streak = { current: 5, best: 5, lastCompletedDate: '2026-09-25' };
    expect(effectiveStreak(streak, '2026-09-25')).toBe(5);
    expect(effectiveStreak(streak, '2026-09-26')).toBe(5);
  });

  it('shows zero once a day has been missed', () => {
    const streak = { current: 5, best: 5, lastCompletedDate: '2026-09-25' };
    expect(effectiveStreak(streak, '2026-09-27')).toBe(0);
  });

  it('shows zero with no history', () => {
    expect(effectiveStreak({ current: 0, best: 0, lastCompletedDate: null }, '2026-09-25')).toBe(0);
  });
});

describe('completeSession', () => {
  it('records the session, clears in-flight state and sets the streak', () => {
    const start: Progress = { ...emptyProgress(), inFlight: session('2026-09-25') };
    const { progress } = completeSession(start, session('2026-09-25'));

    expect(progress.sessions).toHaveLength(1);
    expect(progress.sessions[0]?.completed).toBe(true);
    expect(progress.inFlight).toBeNull();
    expect(progress.streak.current).toBe(1);
    expect(isDoneFor(progress, '2026-09-25')).toBe(true);
  });

  it('raises the level after two strong days', () => {
    let progress: Progress = { ...emptyProgress(), levels: { math: 5, memory: 5 } };
    progress = completeSession(progress, session('2026-09-24', 5)).progress;
    const { progress: after, decisions } = completeSession(progress, session('2026-09-25', 5));

    expect(decisions.math.direction).toBe('up');
    expect(after.levels.math).toBe(6);
    expect(after.streak.current).toBe(2);
  });

  it('lowers the level after a weak day', () => {
    const start: Progress = { ...emptyProgress(), levels: { math: 5, memory: 5 } };
    const { progress, decisions } = completeSession(start, session('2026-09-25', 0));
    expect(decisions.math.direction).toBe('down');
    expect(progress.levels.math).toBe(4);
  });

  it('replaces rather than duplicates a day that was already recorded', () => {
    let progress = completeSession(emptyProgress(), session('2026-09-25', 0)).progress;
    progress = completeSession(progress, session('2026-09-25', 5)).progress;

    expect(progress.sessions).toHaveLength(1);
    expect(progress.sessions[0]?.results.filter((r) => r.correct)).toHaveLength(5);
    // Re-recording the same day must not inflate the streak.
    expect(progress.streak.current).toBe(1);
  });

  it('breaks the streak when a day is skipped', () => {
    let progress = completeSession(emptyProgress(), session('2026-09-23', 5)).progress;
    progress = completeSession(progress, session('2026-09-24', 5)).progress;
    expect(progress.streak.current).toBe(2);

    // Nothing on the 25th; next session is the 26th.
    progress = completeSession(progress, session('2026-09-26', 5)).progress;
    expect(progress.streak.current).toBe(1);
    expect(progress.streak.best).toBe(2);
  });

  it('keeps a week of history in order', () => {
    let progress = emptyProgress();
    for (let day = 20; day <= 26; day += 1) {
      progress = completeSession(progress, session(`2026-09-${day}`, 4)).progress;
    }
    expect(progress.sessions.map((entry) => entry.date)).toEqual([
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
    ]);
    expect(progress.streak.current).toBe(7);
  });

  it('survives a save/load round trip mid-streak', () => {
    const { store } = fakeStore();
    let progress = completeSession(emptyProgress(), session('2026-09-24', 5)).progress;
    saveProgress(progress, store);

    progress = loadProgress(store);
    const { progress: after } = completeSession(progress, session('2026-09-25', 5));
    expect(after.streak.current).toBe(2);
    expect(after.levels.math).toBe(2);
  });
});
