/** The two skill families BrainReps tracks separately. */
export type Family = 'math' | 'memory';

export const FAMILIES: readonly Family[] = ['math', 'memory'];

/** Levels are always clamped to this inclusive range. */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

/** Questions per daily session. */
export const QUESTIONS_PER_SESSION = 5;

/** A seeded random source. Deterministic for a given seed. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform pick from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** A copy of `items` in random order. */
  shuffle<T>(items: readonly T[]): T[];
}

/** What a memory exercise shows before hiding it and asking the question. */
export interface StudyPhase {
  /** Lines to memorise, e.g. ['4', '9', '1', '7'] or ['Anna — 34']. */
  items: string[];
  /** How long the items stay visible. */
  durationMs: number;
  /** Shown alongside the items, e.g. 'Remember these in order'. */
  hint?: string;
  /** Rendered as one run-together block rather than separate chips. */
  layout?: 'chips' | 'list';
}

/**
 * Drives which input the UI shows: a numeric keypad, a text field, a digit
 * pad for sequences, or a row of tappable choices.
 */
export type AnswerKind = 'number' | 'text' | 'sequence' | 'choice';

/** One concrete question, ready to render. */
export interface ExerciseInstance {
  kind: string;
  family: Family;
  level: number;
  /** Memory exercises only: shown first, then hidden. */
  study?: StudyPhase;
  question: string;
  answerKind: AnswerKind;
  /** Required when `answerKind` is 'choice': the buttons to offer. */
  options?: readonly string[];
  /** The canonical correct answer, for display after answering. */
  expected: string;
  /** True if `input` is correct, after normalising whitespace/case. */
  check(input: string): boolean;
  /** Shown when the answer was wrong, e.g. how to get there. */
  explain?: string;
  /** Answering within this time counts as fluent; feeds the level rules. */
  targetMs: number;
}

/** A pluggable question generator. One per file in `engine/exercises`. */
export interface Exercise {
  kind: string;
  family: Family;
  /** Human-readable name, used in stats. */
  label: string;
  generate(level: number, rng: Rng): ExerciseInstance;
}

/** One answered question. */
export interface AttemptResult {
  kind: string;
  family: Family;
  level: number;
  question: string;
  expected: string;
  given: string;
  correct: boolean;
  ms: number;
  targetMs: number;
}

/** A day's session, in progress or finished. */
export interface SessionRecord {
  /** Local calendar day, 'YYYY-MM-DD'. */
  date: string;
  /** Levels the session was generated at, per family. */
  levelsAtStart: Record<Family, number>;
  results: AttemptResult[];
  /** Set once all questions are answered. */
  completed: boolean;
}

export function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}
