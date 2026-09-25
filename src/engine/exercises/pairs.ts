import type { Exercise, ExerciseInstance, Rng } from '../types.ts';
import { at, byLevel, normalizeNumber, normalizeText } from '../util.ts';
import { NAMES } from './data.ts';

/** How many name→number pairs to hold, by level. */
const COUNT_BY_LEVEL: readonly number[] = [3, 3, 4, 4, 5, 5, 5, 6, 6, 7];

/** From this level up you are sometimes asked the other way round. */
const REVERSE_FROM_LEVEL = 7;

const pairs: Exercise = {
  kind: 'pairs',
  family: 'memory',
  label: 'Name & number pairs',

  generate(level: number, rng: Rng): ExerciseInstance {
    const count = byLevel(COUNT_BY_LEVEL, level);
    const names = rng.shuffle(NAMES).slice(0, count);

    // Distinct numbers, so a reverse question always has one answer.
    const numbers: number[] = [];
    while (numbers.length < count) {
      const candidate = rng.int(10, 99);
      if (!numbers.includes(candidate)) numbers.push(candidate);
    }

    const study = {
      items: names.map((name, i) => `${name} — ${at(numbers, i)}`),
      durationMs: 1200 * count + 1500,
      hint: 'Memorise who has which number',
      layout: 'list' as const,
    };

    const askIndex = rng.int(0, count - 1);
    const askedName = at(names, askIndex);
    const askedNumber = at(numbers, askIndex);
    const allPairs = study.items.join(', ');
    const reverse = level >= REVERSE_FROM_LEVEL && rng.next() < 0.5;

    if (reverse) {
      return {
        kind: 'pairs',
        family: 'memory',
        level,
        study,
        question: `Who had the number ${askedNumber}?`,
        answerKind: 'choice',
        options: rng.shuffle(names),
        expected: askedName,
        check: (input) => normalizeText(input) === normalizeText(askedName),
        explain: `The pairs were: ${allPairs}.`,
        targetMs: 5000 + count * 800,
      };
    }

    return {
      kind: 'pairs',
      family: 'memory',
      level,
      study,
      question: `Which number was with ${askedName}?`,
      answerKind: 'number',
      expected: String(askedNumber),
      check: (input) => normalizeNumber(input) === String(askedNumber),
      explain: `The pairs were: ${allPairs}.`,
      targetMs: 5000 + count * 800,
    };
  },
};

export default pairs;
