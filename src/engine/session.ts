import type { DateString } from './date.ts';
import { createRng, seedFor } from './rng.ts';
import { exercisesFor } from './registry.ts';
import { clampLevel, QUESTIONS_PER_SESSION } from './types.ts';
import type { ExerciseInstance, Family } from './types.ts';
import { at } from './util.ts';

/**
 * Three mental-math questions and two memory questions, interleaved so you
 * never do both memory tasks back to back.
 */
export const MIX: readonly Family[] = ['math', 'math', 'memory', 'math', 'memory'];

/**
 * The ramp inside a session: it opens one level below your current level and
 * finishes one above, so there is always a gentle start and a stretch at the end.
 */
export const LEVEL_OFFSETS: readonly number[] = [-1, 0, 0, 1, 1];

/**
 * The five questions for `date`. Deterministic: the same date and levels always
 * produce the same five questions, so reloading mid-session resumes rather than
 * rerolling, and a question you find hard can't be skipped by refreshing.
 */
export function buildDailySession(
  date: DateString,
  levels: Record<Family, number>,
): ExerciseInstance[] {
  // Shuffle each family's exercise types once per day, then deal them out, so
  // the three math slots get three *different* kinds rather than risking three
  // rounds of arithmetic.
  const dealt: Record<Family, readonly ReturnType<typeof exercisesFor>[number][]> = {
    math: createRng(`${date}|math`).shuffle(exercisesFor('math')),
    memory: createRng(`${date}|memory`).shuffle(exercisesFor('memory')),
  };
  const usedPerFamily: Record<Family, number> = { math: 0, memory: 0 };

  return MIX.slice(0, QUESTIONS_PER_SESSION).map((family, index) => {
    const candidates = dealt[family];
    const exercise = at(candidates, usedPerFamily[family] % candidates.length);
    usedPerFamily[family] += 1;

    const level = clampLevel(levels[family] + at(LEVEL_OFFSETS, index));
    const rng = createRng(seedFor(date, index, exercise.kind));
    return exercise.generate(level, rng);
  });
}
