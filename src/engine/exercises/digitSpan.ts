import type { Exercise, ExerciseInstance, Rng } from '../types.ts';
import { byLevel, digitsOnly } from '../util.ts';

/** How many digits to hold, by level. */
const SPAN_BY_LEVEL: readonly number[] = [4, 4, 5, 5, 6, 6, 7, 8, 9, 10];

/** From this level up the digits must come back in reverse — much harder. */
const REVERSE_FROM_LEVEL = 6;

const digitSpan: Exercise = {
  kind: 'digit-span',
  family: 'memory',
  label: 'Digit span',

  generate(level: number, rng: Rng): ExerciseInstance {
    const span = byLevel(SPAN_BY_LEVEL, level);
    const reverse = level >= REVERSE_FROM_LEVEL;

    // Avoid a leading zero: it reads as noise and is easy to drop when typing.
    const digits = Array.from({ length: span }, (_, i) => rng.int(i === 0 ? 1 : 0, 9));
    const answer = reverse ? [...digits].reverse() : digits;
    const expected = answer.join('');

    return {
      kind: 'digit-span',
      family: 'memory',
      level,
      study: {
        items: digits.map(String),
        // Roughly a second per digit, plus a beat to settle.
        durationMs: 800 * span + 1000,
        hint: reverse
          ? 'Memorise these — you will type them backwards'
          : 'Memorise these in order',
        layout: 'chips',
      },
      question: reverse
        ? 'Type the digits in reverse order'
        : 'Type the digits in the order you saw them',
      answerKind: 'sequence',
      expected,
      check: (input) => digitsOnly(input) === expected,
      explain: reverse
        ? `You saw ${digits.join(' ')}, so backwards that is ${expected}.`
        : `The digits were ${expected}.`,
      targetMs: 2500 + span * 1200,
    };
  },
};

export default digitSpan;
