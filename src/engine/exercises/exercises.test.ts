import { describe, expect, it } from 'vitest';
import { createRng } from '../rng.ts';
import { EXERCISES, exercisesFor } from '../registry.ts';
import { MAX_LEVEL, MIN_LEVEL } from '../types.ts';
import type { ExerciseInstance } from '../types.ts';
import arithmetic from './arithmetic.ts';
import percent from './percent.ts';
import sequence from './sequence.ts';
import digitSpan from './digitSpan.ts';
import wordList from './wordList.ts';
import pairs from './pairs.ts';
import { NAMES, WORDS } from './data.ts';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const SAMPLES = 40;

/** Every instance an exercise produces across all levels, for bulk assertions. */
function sample(
  exercise: (typeof EXERCISES)[number],
  level: number,
  count = SAMPLES,
): ExerciseInstance[] {
  return Array.from({ length: count }, (_, i) =>
    exercise.generate(level, createRng(`${exercise.kind}|${level}|${i}`)),
  );
}

describe.each(EXERCISES.map((exercise) => [exercise.kind, exercise] as const))(
  '%s — contract',
  (_kind, exercise) => {
    it('accepts its own expected answer at every level', () => {
      for (const level of LEVELS) {
        for (const instance of sample(exercise, level)) {
          expect(
            instance.check(instance.expected),
            `${exercise.kind} L${level} rejected its own answer "${instance.expected}" for "${instance.question}"`,
          ).toBe(true);
        }
      }
    });

    it('reports the level it was asked for and fills in the basics', () => {
      for (const level of LEVELS) {
        for (const instance of sample(exercise, level, 5)) {
          expect(instance.level).toBe(level);
          expect(instance.kind).toBe(exercise.kind);
          expect(instance.family).toBe(exercise.family);
          expect(instance.question.length).toBeGreaterThan(0);
          expect(instance.expected.length).toBeGreaterThan(0);
          expect(instance.targetMs).toBeGreaterThan(0);
        }
      }
    });

    it('rejects an empty answer', () => {
      for (const level of LEVELS) {
        for (const instance of sample(exercise, level, 5)) {
          expect(instance.check('')).toBe(false);
        }
      }
    });

    it('offers options exactly when the answer is a choice', () => {
      for (const level of LEVELS) {
        for (const instance of sample(exercise, level, 10)) {
          if (instance.answerKind === 'choice') {
            expect(instance.options?.length ?? 0).toBeGreaterThan(1);
            expect(instance.options).toContain(instance.expected);
          } else {
            expect(instance.options).toBeUndefined();
          }
        }
      }
    });

    it('gives memory exercises a study phase and math exercises none', () => {
      for (const level of LEVELS) {
        for (const instance of sample(exercise, level, 5)) {
          if (exercise.family === 'memory') {
            expect(instance.study).toBeDefined();
            expect(instance.study?.items.length ?? 0).toBeGreaterThan(0);
            expect(instance.study?.durationMs ?? 0).toBeGreaterThan(0);
          } else {
            expect(instance.study).toBeUndefined();
          }
        }
      }
    });

    it('is deterministic for a given seed', () => {
      const a = exercise.generate(5, createRng('same-seed'));
      const b = exercise.generate(5, createRng('same-seed'));
      expect(a.question).toBe(b.question);
      expect(a.expected).toBe(b.expected);
      expect(a.study?.items).toEqual(b.study?.items);
    });
  },
);

/* ------------------------------- arithmetic ------------------------------ */

/**
 * Re-computes the answer from the printed question, independently of the
 * generator, so a bug in the generator's own maths can't pass unnoticed.
 */
function evaluateArithmetic(question: string): number {
  const square = /^(\d+)² = \?$/.exec(question);
  if (square) return Number(square[1]) ** 2;

  const threeTerm = /^(\d+) \+ (\d+) \+ (\d+) = \?$/.exec(question);
  if (threeTerm) return Number(threeTerm[1]) + Number(threeTerm[2]) + Number(threeTerm[3]);

  const binary = /^(\d+) ([+−×÷]) (\d+) = \?$/.exec(question);
  if (!binary) throw new Error(`Unparseable arithmetic question: ${question}`);
  const left = Number(binary[1]);
  const right = Number(binary[3]);
  switch (binary[2]) {
    case '+':
      return left + right;
    case '−':
      return left - right;
    case '×':
      return left * right;
    case '÷':
      return left / right;
    default:
      throw new Error(`Unknown operator in: ${question}`);
  }
}

describe('arithmetic', () => {
  it('states an answer that matches the question it printed', () => {
    for (const level of LEVELS) {
      for (const instance of sample(arithmetic, level)) {
        expect(Number(instance.expected), instance.question).toBe(
          evaluateArithmetic(instance.question),
        );
      }
    }
  });

  it('never asks for a negative result or an inexact division', () => {
    for (const level of LEVELS) {
      for (const instance of sample(arithmetic, level)) {
        const answer = Number(instance.expected);
        expect(answer, instance.question).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(answer), instance.question).toBe(true);
      }
    }
  });

  it('accepts answers typed with spaces or thousands separators', () => {
    const instance = arithmetic.generate(10, createRng('formatting'));
    const answer = Number(instance.expected);
    if (answer >= 1000) {
      const grouped = answer.toLocaleString('en-US');
      expect(instance.check(grouped)).toBe(true);
    }
    expect(instance.check(` ${instance.expected} `)).toBe(true);
  });

  it('gets harder: answers at level 10 dwarf level 1', () => {
    const magnitude = (level: number) =>
      sample(arithmetic, level).reduce((sum, i) => sum + Number(i.expected), 0) / SAMPLES;
    expect(magnitude(MAX_LEVEL)).toBeGreaterThan(magnitude(MIN_LEVEL) * 10);
  });

  it('allows more time at higher levels', () => {
    const easy = sample(arithmetic, 1, 10).map((i) => i.targetMs);
    const hard = sample(arithmetic, 10, 10).map((i) => i.targetMs);
    expect(Math.min(...hard)).toBeGreaterThan(Math.max(...easy));
  });
});

/* -------------------------------- percent ------------------------------- */

describe('percent', () => {
  it('always has a whole-number answer', () => {
    for (const level of LEVELS) {
      for (const instance of sample(percent, level)) {
        expect(Number.isInteger(Number(instance.expected)), instance.question).toBe(true);
      }
    }
  });

  it('computes "P% of B" and "X is what % of B" correctly', () => {
    let checked = 0;
    for (const level of LEVELS) {
      for (const instance of sample(percent, level)) {
        const of = /^(\d+)% of (\d+) = \?$/.exec(instance.question);
        if (of) {
          expect(Number(instance.expected)).toBe((Number(of[1]) * Number(of[2])) / 100);
          checked += 1;
          continue;
        }
        const which = /^(\d+) is what % of (\d+)\?$/.exec(instance.question);
        if (which) {
          expect(Number(instance.expected)).toBe((Number(which[1]) * 100) / Number(which[2]));
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('keeps discounted prices below the original and tips above it', () => {
    for (const level of LEVELS) {
      for (const instance of sample(percent, level)) {
        const discount = /costs (\d+)€ with (\d+)% off/.exec(instance.question);
        if (discount) {
          expect(Number(instance.expected)).toBeLessThan(Number(discount[1]));
          expect(Number(instance.expected)).toBeGreaterThan(0);
        }
        const tip = /bill is (\d+)€ and you add a (\d+)% tip/.exec(instance.question);
        if (tip) {
          expect(Number(instance.expected)).toBeGreaterThan(Number(tip[1]));
        }
      }
    }
  });
});

/* -------------------------------- sequence ------------------------------ */

describe('sequence', () => {
  it('shows five whole terms and asks for the sixth', () => {
    for (const level of LEVELS) {
      for (const instance of sample(sequence, level)) {
        const shown = instance.question.replace(/^What comes next\?\s*/, '').replace(/, \?$/, '');
        const terms = shown.split(', ').map(Number);
        expect(terms, instance.question).toHaveLength(5);
        for (const term of terms) {
          expect(Number.isInteger(term), instance.question).toBe(true);
        }
        expect(Number.isInteger(Number(instance.expected)), instance.question).toBe(true);
      }
    }
  });

  it('never produces a constant sequence or runaway numbers', () => {
    for (const level of LEVELS) {
      for (const instance of sample(sequence, level)) {
        const shown = instance.question.replace(/^What comes next\?\s*/, '').replace(/, \?$/, '');
        const terms = [...shown.split(', ').map(Number), Number(instance.expected)];
        expect(new Set(terms).size, instance.question).toBeGreaterThan(1);
        for (const term of terms) {
          expect(Math.abs(term), instance.question).toBeLessThan(10_000_000);
        }
      }
    }
  });

  it('always explains the rule', () => {
    for (const level of LEVELS) {
      for (const instance of sample(sequence, level, 10)) {
        expect(instance.explain ?? '').toMatch(/next term is/);
      }
    }
  });
});

/* ------------------------------- digit span ----------------------------- */

describe('digit span', () => {
  it('grows the span with the level', () => {
    const span = (level: number) => digitSpan.generate(level, createRng('span')).expected.length;
    expect(span(1)).toBe(4);
    expect(span(10)).toBe(10);
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(span(level)).toBeGreaterThanOrEqual(span(level - 1));
    }
  });

  it('asks for the digits forwards below level 6 and backwards from level 6', () => {
    for (const level of LEVELS) {
      for (const instance of sample(digitSpan, level, 10)) {
        const shown = (instance.study?.items ?? []).join('');
        if (level < 6) {
          expect(instance.expected).toBe(shown);
          expect(instance.question).toMatch(/order you saw/);
        } else {
          expect(instance.expected).toBe([...shown].reverse().join(''));
          expect(instance.question).toMatch(/reverse/);
        }
      }
    }
  });

  it('accepts digits typed with spaces or dashes', () => {
    const instance = digitSpan.generate(3, createRng('typing'));
    expect(instance.check([...instance.expected].join(' '))).toBe(true);
    expect(instance.check([...instance.expected].join('-'))).toBe(true);
    expect(instance.check(instance.expected.slice(0, -1))).toBe(false);
  });

  it('never starts with a zero', () => {
    for (const level of LEVELS) {
      for (const instance of sample(digitSpan, level)) {
        expect(instance.study?.items[0]).not.toBe('0');
      }
    }
  });
});

/* ------------------------------- word list ------------------------------ */

describe('word list', () => {
  it('draws distinct real words and shows more of them at higher levels', () => {
    for (const level of LEVELS) {
      for (const instance of sample(wordList, level, 10)) {
        const items = instance.study?.items ?? [];
        expect(new Set(items).size).toBe(items.length);
        for (const word of items) expect(WORDS).toContain(word);
      }
    }
    const count = (level: number) =>
      wordList.generate(level, createRng('count')).study?.items.length ?? 0;
    expect(count(10)).toBeGreaterThan(count(1));
  });

  it('odd-one-out offers four options, only one of which was unseen', () => {
    for (const level of LEVELS) {
      for (const instance of sample(wordList, level, 10)) {
        if (instance.answerKind !== 'choice') continue;
        const items = instance.study?.items ?? [];
        const options = instance.options ?? [];
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options.filter((option) => !items.includes(option))).toEqual([instance.expected]);
      }
    }
  });

  it('free recall passes at the stated threshold and fails below it', () => {
    for (const level of LEVELS) {
      for (const instance of sample(wordList, level, 10)) {
        if (instance.answerKind !== 'text') continue;
        const items = instance.study?.items ?? [];
        const required = Number(/at least (\d+)/.exec(instance.question)?.[1] ?? '0');
        expect(required).toBeGreaterThan(0);
        expect(required).toBeLessThanOrEqual(items.length);

        expect(instance.check(items.slice(0, required).join(' '))).toBe(true);
        expect(instance.check(items.slice(0, required - 1).join(' '))).toBe(false);
        // Repeating one word must not count as several.
        expect(instance.check(Array(required).fill(items[0]).join(' '))).toBe(false);
        // Words that were never shown must not count.
        expect(instance.check('aardvark bassoon chandelier dulcimer escalator flagon')).toBe(false);
      }
    }
  });

  it('is case- and punctuation-tolerant on free recall', () => {
    for (const level of LEVELS) {
      const instance = wordList.generate(level, createRng('tolerance'));
      if (instance.answerKind !== 'text') continue;
      const items = instance.study?.items ?? [];
      const required = Number(/at least (\d+)/.exec(instance.question)?.[1] ?? '0');
      const typed = items
        .slice(0, required)
        .map((word) => word.toUpperCase())
        .join(', ');
      expect(instance.check(typed)).toBe(true);
    }
  });
});

/* --------------------------------- pairs -------------------------------- */

describe('pairs', () => {
  it('pairs distinct names with distinct numbers', () => {
    for (const level of LEVELS) {
      for (const instance of sample(pairs, level, 10)) {
        const items = instance.study?.items ?? [];
        const names = items.map((item) => item.split(' — ')[0] ?? '');
        const numbers = items.map((item) => item.split(' — ')[1] ?? '');
        expect(new Set(names).size).toBe(names.length);
        expect(new Set(numbers).size).toBe(numbers.length);
        for (const name of names) expect(NAMES).toContain(name);
        for (const number of numbers) expect(Number(number)).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('asks about a pair it actually showed', () => {
    for (const level of LEVELS) {
      for (const instance of sample(pairs, level)) {
        const items = instance.study?.items ?? [];
        const asked = items.some((item) => {
          const [name = '', number = ''] = item.split(' — ');
          return instance.expected === name || instance.expected === number;
        });
        expect(asked, `${instance.question} / ${instance.expected}`).toBe(true);
      }
    }
  });

  it('holds more pairs at higher levels', () => {
    const count = (level: number) => pairs.generate(level, createRng('n')).study?.items.length ?? 0;
    expect(count(10)).toBeGreaterThan(count(1));
  });
});

/* ------------------------------- registry ------------------------------- */

describe('registry', () => {
  it('has unique kinds', () => {
    const kinds = EXERCISES.map((exercise) => exercise.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('has at least as many math and memory types as a session needs', () => {
    expect(exercisesFor('math').length).toBeGreaterThanOrEqual(3);
    expect(exercisesFor('memory').length).toBeGreaterThanOrEqual(2);
  });
});
