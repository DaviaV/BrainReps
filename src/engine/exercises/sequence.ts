import type { Exercise, ExerciseInstance, Rng } from '../types.ts';
import { byLevel, normalizeNumber } from '../util.ts';

type Rule = 'arithmetic' | 'geometric' | 'quadratic' | 'interleaved' | 'affine' | 'fibonacci';

const LEVELS: readonly (readonly Rule[])[] = [
  ['arithmetic'],
  ['arithmetic'],
  ['arithmetic'],
  ['arithmetic', 'geometric'],
  ['geometric', 'arithmetic'],
  ['geometric', 'quadratic'],
  ['quadratic', 'interleaved'],
  ['interleaved', 'affine'],
  ['affine', 'fibonacci', 'quadratic'],
  ['fibonacci', 'affine', 'interleaved'],
];

const TERMS_SHOWN = 5;

interface Built {
  /** TERMS_SHOWN visible terms plus the answer at the end. */
  terms: number[];
  explain: string;
}

function build(rule: Rule, level: number, rng: Rng): Built {
  switch (rule) {
    case 'arithmetic': {
      const maxStep = 3 + level * 2;
      const step = rng.int(2, maxStep) * (level >= 2 && rng.next() < 0.35 ? -1 : 1);
      const start = step < 0 ? rng.int(60, 120) : rng.int(1, 20);
      const terms = Array.from({ length: TERMS_SHOWN + 1 }, (_, i) => start + i * step);
      return {
        terms,
        explain: `Each term ${step < 0 ? 'drops' : 'rises'} by ${Math.abs(step)}.`,
      };
    }

    case 'geometric': {
      const ratio = rng.pick(level >= 5 ? [2, 3, 4] : [2, 3]);
      const start = rng.int(1, ratio === 2 ? 6 : 4);
      const terms = Array.from({ length: TERMS_SHOWN + 1 }, (_, i) => start * ratio ** i);
      return { terms, explain: `Each term is the one before it × ${ratio}.` };
    }

    case 'quadratic': {
      // Constant second difference: the gaps themselves grow steadily.
      const secondDiff = rng.int(1, level >= 9 ? 5 : 3);
      const firstDiff = rng.int(2, 8);
      const start = rng.int(1, 15);
      const terms: number[] = [start];
      let gap = firstDiff;
      for (let i = 1; i <= TERMS_SHOWN; i += 1) {
        terms.push((terms[i - 1] ?? start) + gap);
        gap += secondDiff;
      }
      return {
        terms,
        explain: `The gaps grow: +${firstDiff}, then each gap is ${secondDiff} more than the last.`,
      };
    }

    case 'interleaved': {
      // Two simple series zipped together — the trick is spotting there are two.
      const startA = rng.int(1, 20);
      const stepA = rng.int(2, 9);
      const startB = rng.int(30, 80);
      const stepB = rng.int(2, 9) * (rng.next() < 0.5 ? -1 : 1);
      const terms: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        terms.push(startA + i * stepA);
        terms.push(startB + i * stepB);
      }
      return {
        terms,
        explain: `Two series take turns: the 1st, 3rd, 5th rise by ${stepA}; the 2nd, 4th, 6th change by ${stepB}.`,
      };
    }

    case 'affine': {
      const ratio = rng.pick([2, 3]);
      const start = rng.int(1, 8);
      let offset = rng.int(1, 6) * (rng.next() < 0.3 ? -1 : 1);
      // A negative offset can land exactly on the fixed point — start 3, ×2, −3
      // gives 3, 3, 3, 3 — or send the terms running off downwards. Either way
      // the puzzle stops being a puzzle, so keep the sequence growing.
      if (start * (ratio - 1) + offset <= 0) offset = Math.abs(offset);
      const terms: number[] = [start];
      for (let i = 1; i <= TERMS_SHOWN; i += 1) {
        terms.push((terms[i - 1] ?? start) * ratio + offset);
      }
      return {
        terms,
        explain: `Each term is the one before it × ${ratio} ${offset < 0 ? '−' : '+'} ${Math.abs(offset)}.`,
      };
    }

    case 'fibonacci': {
      const a = rng.int(1, 9);
      const b = rng.int(2, 12);
      const terms: number[] = [a, b];
      for (let i = 2; i <= TERMS_SHOWN; i += 1) {
        terms.push((terms[i - 1] ?? 0) + (terms[i - 2] ?? 0));
      }
      return { terms, explain: 'Each term is the sum of the two before it.' };
    }
  }
}

const sequence: Exercise = {
  kind: 'sequence',
  family: 'math',
  label: 'Number sequences',

  generate(level: number, rng: Rng): ExerciseInstance {
    const rule = rng.pick(byLevel(LEVELS, level));
    const { terms, explain } = build(rule, level, rng);
    const answer = terms[TERMS_SHOWN];
    const shown = terms.slice(0, TERMS_SHOWN);
    const expected = String(answer);

    return {
      kind: 'sequence',
      family: 'math',
      level,
      question: `What comes next?  ${shown.join(', ')}, ?`,
      answerKind: 'number',
      expected,
      check: (input) => normalizeNumber(input) === normalizeNumber(expected),
      explain: `${explain} So the next term is ${expected}.`,
      targetMs: 8000 + level * 1800,
    };
  },
};

export default sequence;
