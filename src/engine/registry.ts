import type { Exercise, Family } from './types.ts';
import arithmetic from './exercises/arithmetic.ts';
import percent from './exercises/percent.ts';
import sequence from './exercises/sequence.ts';
import digitSpan from './exercises/digitSpan.ts';
import wordList from './exercises/wordList.ts';
import pairs from './exercises/pairs.ts';

/**
 * Every exercise type the app knows about. Adding a new one means writing a
 * file in `exercises/` and adding it here — nothing else changes.
 */
export const EXERCISES: readonly Exercise[] = [
  arithmetic,
  percent,
  sequence,
  digitSpan,
  wordList,
  pairs,
];

export function exercisesFor(family: Family): readonly Exercise[] {
  return EXERCISES.filter((exercise) => exercise.family === family);
}

export function exerciseByKind(kind: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.kind === kind);
}

/** Display name for a kind, falling back to the raw kind for old saved data. */
export function labelFor(kind: string): string {
  return exerciseByKind(kind)?.label ?? kind;
}
