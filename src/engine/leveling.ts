import { clampLevel, MAX_LEVEL, MIN_LEVEL } from './types.ts';
import type { AttemptResult, Family, SessionRecord } from './types.ts';

/**
 * Adaptive difficulty. Pure functions over finished sessions — no clock, no
 * storage — so the rules can be tested by handing them a history.
 */

/** Two good days in a row move you up; one bad day moves you down. */
export const LEVEL_UP_ACCURACY = 0.8;
export const LEVEL_DOWN_ACCURACY = 0.5;
export const SESSIONS_FOR_LEVEL_UP = 2;
/** Answer time as a fraction of the exercise's target time. */
export const FLUENT_RATIO = 1;

export interface FamilyOutcome {
  answered: number;
  correct: number;
  accuracy: number;
  /** Median of (time taken ÷ target time). Below 1 means fluent. */
  medianRatio: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Accuracy and speed for one family within a set of attempts. */
export function summarize(results: readonly AttemptResult[], family: Family): FamilyOutcome | null {
  const relevant = results.filter((result) => result.family === family);
  if (relevant.length === 0) return null;

  const correct = relevant.filter((result) => result.correct).length;
  const ratios = relevant.map((result) =>
    result.targetMs > 0 ? result.ms / result.targetMs : 1,
  );

  return {
    answered: relevant.length,
    correct,
    accuracy: correct / relevant.length,
    medianRatio: median(ratios),
  };
}

export interface LevelDecision {
  level: number;
  direction: 'up' | 'down' | 'hold';
  /** Shown on the summary screen so the change never feels arbitrary. */
  reason: string;
}

/**
 * The level to use for `family` tomorrow, given the current level and the
 * session history (oldest first, newest last — including the session just
 * finished). Moves at most one level per day and stays within 1–10.
 */
export function decideLevel(
  current: number,
  history: readonly SessionRecord[],
  family: Family,
): LevelDecision {
  const outcomes = history
    .filter((session) => session.completed)
    .map((session) => summarize(session.results, family))
    .filter((outcome): outcome is FamilyOutcome => outcome !== null);

  const latest = outcomes[outcomes.length - 1];
  if (!latest) {
    return { level: clampLevel(current), direction: 'hold', reason: 'No results yet.' };
  }

  const asPercent = Math.round(latest.accuracy * 100);

  if (latest.accuracy < LEVEL_DOWN_ACCURACY) {
    if (current <= MIN_LEVEL) {
      return {
        level: MIN_LEVEL,
        direction: 'hold',
        reason: `${asPercent}% correct — already at the easiest level, so we will stay here.`,
      };
    }
    return {
      level: clampLevel(current - 1),
      direction: 'down',
      reason: `${asPercent}% correct — easing off a level.`,
    };
  }

  const recent = outcomes.slice(-SESSIONS_FOR_LEVEL_UP);
  const enoughSessions = recent.length >= SESSIONS_FOR_LEVEL_UP;
  const allAccurate = recent.every((outcome) => outcome.accuracy >= LEVEL_UP_ACCURACY);
  const allFluent = recent.every((outcome) => outcome.medianRatio <= FLUENT_RATIO);

  if (enoughSessions && allAccurate && allFluent) {
    if (current >= MAX_LEVEL) {
      return {
        level: MAX_LEVEL,
        direction: 'hold',
        reason: 'Top level, and holding it. Nicely done.',
      };
    }
    return {
      level: clampLevel(current + 1),
      direction: 'up',
      reason: `Accurate and quick ${SESSIONS_FOR_LEVEL_UP} sessions running — moving up a level.`,
    };
  }

  if (enoughSessions && allAccurate && !allFluent) {
    return {
      level: clampLevel(current),
      direction: 'hold',
      reason: `${asPercent}% correct, but still slow — one more quick session to move up.`,
    };
  }

  return {
    level: clampLevel(current),
    direction: 'hold',
    reason: `${asPercent}% correct — holding this level.`,
  };
}

/** Level decisions for every family after a session. */
export function decideLevels(
  current: Record<Family, number>,
  history: readonly SessionRecord[],
): Record<Family, LevelDecision> {
  return {
    math: decideLevel(current.math, history, 'math'),
    memory: decideLevel(current.memory, history, 'memory'),
  };
}
