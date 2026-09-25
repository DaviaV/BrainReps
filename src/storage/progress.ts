import { daysBetween } from '../engine/date.ts';
import type { DateString } from '../engine/date.ts';
import { decideLevels } from '../engine/leveling.ts';
import type { LevelDecision } from '../engine/leveling.ts';
import { clampLevel, FAMILIES } from '../engine/types.ts';
import type { AttemptResult, Family, SessionRecord } from '../engine/types.ts';

export const STORAGE_KEY = 'brainreps.v1';
export const SCHEMA_VERSION = 1;

/** Keep about a year of history; enough for the stats view, small in storage. */
const MAX_SESSIONS = 400;

export interface Streak {
  current: number;
  best: number;
  lastCompletedDate: DateString | null;
}

export interface Progress {
  schema: number;
  levels: Record<Family, number>;
  /** Completed sessions, oldest first. */
  sessions: SessionRecord[];
  /** Today's partly-answered session, so a reload picks up where you left off. */
  inFlight: SessionRecord | null;
  streak: Streak;
}

/** The slice of the Storage API we use, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function emptyProgress(): Progress {
  return {
    schema: SCHEMA_VERSION,
    levels: { math: 1, memory: 1 },
    sessions: [],
    inFlight: null,
    streak: { current: 0, best: 0, lastCompletedDate: null },
  };
}

function defaultStore(): StorageLike | null {
  try {
    // Absent in tests, and throws in a browser with site data blocked.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------ validation ------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asAttempt(value: unknown): AttemptResult | null {
  if (!isRecord(value)) return null;
  const { kind, family, level, question, expected, given, correct, ms, targetMs } = value;
  if (typeof kind !== 'string') return null;
  if (family !== 'math' && family !== 'memory') return null;
  if (typeof level !== 'number' || typeof ms !== 'number') return null;
  return {
    kind,
    family,
    level,
    question: typeof question === 'string' ? question : '',
    expected: typeof expected === 'string' ? expected : '',
    given: typeof given === 'string' ? given : '',
    correct: correct === true,
    ms,
    targetMs: typeof targetMs === 'number' && targetMs > 0 ? targetMs : 1,
  };
}

function asSession(value: unknown): SessionRecord | null {
  if (!isRecord(value)) return null;
  const { date, levelsAtStart, results, completed } = value;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!Array.isArray(results)) return null;

  const levels = isRecord(levelsAtStart) ? levelsAtStart : {};
  return {
    date,
    levelsAtStart: {
      math: clampLevel(typeof levels.math === 'number' ? levels.math : 1),
      memory: clampLevel(typeof levels.memory === 'number' ? levels.memory : 1),
    },
    results: results
      .map(asAttempt)
      .filter((attempt): attempt is AttemptResult => attempt !== null),
    completed: completed === true,
  };
}

/**
 * Turn whatever is in storage into a valid Progress. Anything unrecognised is
 * dropped rather than trusted — a corrupt or half-written record must never be
 * able to white-screen the app or throw during render.
 */
export function migrate(raw: unknown): Progress {
  const base = emptyProgress();
  if (!isRecord(raw)) return base;

  // Only schema 1 exists so far. Future versions branch here, and an unknown
  // (newer) schema falls back to a fresh start rather than misreading fields.
  if (typeof raw.schema === 'number' && raw.schema > SCHEMA_VERSION) return base;

  const levels = isRecord(raw.levels) ? raw.levels : {};
  for (const family of FAMILIES) {
    const value = levels[family];
    if (typeof value === 'number' && Number.isFinite(value)) {
      base.levels[family] = clampLevel(value);
    }
  }

  if (Array.isArray(raw.sessions)) {
    base.sessions = raw.sessions
      .map(asSession)
      .filter((session): session is SessionRecord => session !== null)
      .slice(-MAX_SESSIONS);
  }

  base.inFlight = asSession(raw.inFlight);

  if (isRecord(raw.streak)) {
    const { current, best, lastCompletedDate } = raw.streak;
    base.streak = {
      current: typeof current === 'number' && current >= 0 ? Math.floor(current) : 0,
      best: typeof best === 'number' && best >= 0 ? Math.floor(best) : 0,
      lastCompletedDate:
        typeof lastCompletedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastCompletedDate)
          ? lastCompletedDate
          : null,
    };
  }

  return base;
}

/* ------------------------------ persistence ----------------------------- */

export function loadProgress(store: StorageLike | null = defaultStore()): Progress {
  if (!store) return emptyProgress();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return emptyProgress();
    return migrate(JSON.parse(raw));
  } catch {
    // Unparseable or unreadable: start clean rather than crash.
    return emptyProgress();
  }
}

export function saveProgress(
  progress: Progress,
  store: StorageLike | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private mode or a full quota: losing history is better than crashing.
  }
}

export function clearProgress(store: StorageLike | null = defaultStore()): void {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do.
  }
}

/* -------------------------------- updates ------------------------------- */

export function updateStreak(streak: Streak, date: DateString): Streak {
  // Completing the same day twice must not inflate the streak.
  if (streak.lastCompletedDate === date) return streak;

  const continues =
    streak.lastCompletedDate !== null && daysBetween(streak.lastCompletedDate, date) === 1;
  const current = continues ? streak.current + 1 : 1;

  return {
    current,
    best: Math.max(streak.best, current),
    lastCompletedDate: date,
  };
}

/**
 * The streak as it should be *displayed* today. The stored counter is only
 * rewritten when a session completes, so after a missed day it is stale — a
 * streak is alive only if the last session was today or yesterday.
 */
export function effectiveStreak(streak: Streak, date: DateString): number {
  if (streak.lastCompletedDate === null) return 0;
  const gap = daysBetween(streak.lastCompletedDate, date);
  return gap === 0 || gap === 1 ? streak.current : 0;
}

export interface CompletionOutcome {
  progress: Progress;
  decisions: Record<Family, LevelDecision>;
}

/**
 * Record a finished session: append it to history, update the streak, and let
 * the level rules decide where tomorrow starts.
 */
export function completeSession(progress: Progress, session: SessionRecord): CompletionOutcome {
  const completed: SessionRecord = { ...session, completed: true };

  // Replace rather than duplicate if this day was already recorded.
  const withoutThisDay = progress.sessions.filter((entry) => entry.date !== completed.date);
  const sessions = [...withoutThisDay, completed].slice(-MAX_SESSIONS);

  const decisions = decideLevels(progress.levels, sessions);

  return {
    progress: {
      ...progress,
      sessions,
      inFlight: null,
      levels: { math: decisions.math.level, memory: decisions.memory.level },
      streak: updateStreak(progress.streak, completed.date),
    },
    decisions,
  };
}

/** The session for `date` if it was already finished. */
export function sessionFor(progress: Progress, date: DateString): SessionRecord | undefined {
  return progress.sessions.find((session) => session.date === date);
}

export function isDoneFor(progress: Progress, date: DateString): boolean {
  return sessionFor(progress, date) !== undefined;
}
