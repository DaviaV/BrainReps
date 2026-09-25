import type { Exercise, ExerciseInstance, Rng } from '../types.ts';
import { byLevel, normalizeText, normalizeWords } from '../util.ts';
import { WORDS } from './data.ts';

type Variant = 'oddOneOut' | 'freeRecall';

interface LevelSpec {
  count: number;
  variant: Variant;
  /** Fraction of the list you must recall to pass `freeRecall`. */
  threshold?: number;
}

const LEVELS: readonly LevelSpec[] = [
  { count: 5, variant: 'oddOneOut' },
  { count: 6, variant: 'oddOneOut' },
  { count: 6, variant: 'freeRecall', threshold: 0.6 },
  { count: 7, variant: 'freeRecall', threshold: 0.6 },
  { count: 7, variant: 'oddOneOut' },
  { count: 8, variant: 'freeRecall', threshold: 0.625 },
  { count: 8, variant: 'freeRecall', threshold: 0.75 },
  { count: 9, variant: 'freeRecall', threshold: 0.7 },
  { count: 10, variant: 'freeRecall', threshold: 0.7 },
  { count: 10, variant: 'freeRecall', threshold: 0.8 },
];

const wordList: Exercise = {
  kind: 'word-list',
  family: 'memory',
  label: 'Word list',

  generate(level: number, rng: Rng): ExerciseInstance {
    const spec = byLevel(LEVELS, level);
    const pool = rng.shuffle(WORDS);
    const shown = pool.slice(0, spec.count);

    const study = {
      items: shown,
      // Long enough to read each word once and start linking them.
      durationMs: 900 * spec.count + 1500,
      hint: 'Memorise these words',
      layout: 'list' as const,
    };

    if (spec.variant === 'oddOneOut') {
      // Three words that were shown, plus one that was not.
      const intruder = pool[spec.count] ?? 'walrus';
      const decoys = rng.shuffle(shown).slice(0, 3);
      const options = rng.shuffle([...decoys, intruder]);

      return {
        kind: 'word-list',
        family: 'memory',
        level,
        study,
        question: 'Which of these words was NOT in the list?',
        answerKind: 'choice',
        options,
        expected: intruder,
        check: (input) => normalizeText(input) === intruder,
        explain: `The list was: ${shown.join(', ')}.`,
        targetMs: 6000 + level * 500,
      };
    }

    const required = Math.ceil(spec.count * (spec.threshold ?? 0.6));
    const shownSet = new Set(shown);

    return {
      kind: 'word-list',
      family: 'memory',
      level,
      study,
      question: `Type as many of the ${spec.count} words as you remember — at least ${required} to pass.`,
      answerKind: 'text',
      expected: shown.join(', '),
      check: (input) => {
        const recalled = normalizeWords(input).filter((word) => shownSet.has(word));
        return recalled.length >= required;
      },
      explain: `The list was: ${shown.join(', ')}.`,
      targetMs: 4000 + spec.count * 2500,
    };
  },
};

export default wordList;
