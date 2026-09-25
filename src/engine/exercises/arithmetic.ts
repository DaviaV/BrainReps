import type { Exercise, ExerciseInstance, Rng } from '../types.ts';
import { byLevel, normalizeNumber } from '../util.ts';

type Op = 'add' | 'sub' | 'mul' | 'div' | 'add3' | 'square';

type Range = readonly [number, number];

interface Plan {
  op: Op;
  /** First operand, or the quotient for division. */
  a: Range;
  /** Second operand, or the divisor for division. Unused by `square`. */
  b?: Range;
}

/**
 * One row per level. Division rows give the range of the *quotient* and the
 * *divisor*, so the dividend is their product and the division is always exact
 * — nobody wants to do 137 ÷ 6 in their head.
 */
const LEVEL_PLANS: readonly (readonly Plan[])[] = [
  // 1
  [
    { op: 'add', a: [10, 40], b: [2, 9] },
    { op: 'sub', a: [12, 40], b: [2, 9] },
  ],
  // 2
  [
    { op: 'add', a: [11, 60], b: [10, 40] },
    { op: 'sub', a: [20, 80], b: [10, 40] },
    { op: 'mul', a: [2, 9], b: [2, 9] },
  ],
  // 3
  [
    { op: 'add', a: [20, 99], b: [20, 99] },
    { op: 'sub', a: [30, 99], b: [10, 60] },
    { op: 'mul', a: [2, 12], b: [2, 9] },
  ],
  // 4
  [
    { op: 'add3', a: [10, 40] },
    { op: 'mul', a: [11, 25], b: [2, 9] },
    { op: 'div', a: [2, 12], b: [2, 9] },
  ],
  // 5
  [
    { op: 'mul', a: [11, 49], b: [3, 9] },
    { op: 'div', a: [3, 20], b: [3, 9] },
    { op: 'sub', a: [100, 400], b: [20, 99] },
  ],
  // 6
  [
    { op: 'add', a: [100, 600], b: [100, 400] },
    { op: 'mul', a: [12, 99], b: [3, 9] },
    { op: 'square', a: [11, 20] },
  ],
  // 7
  [
    { op: 'mul', a: [11, 25], b: [11, 19] },
    { op: 'div', a: [4, 30], b: [4, 12] },
    { op: 'add3', a: [20, 90] },
  ],
  // 8
  [
    { op: 'mul', a: [21, 49], b: [11, 29] },
    { op: 'square', a: [11, 30] },
    { op: 'sub', a: [500, 999], b: [100, 499] },
  ],
  // 9
  [
    { op: 'mul', a: [101, 499], b: [3, 9] },
    { op: 'div', a: [5, 40], b: [11, 25] },
    { op: 'mul', a: [26, 79], b: [11, 39] },
  ],
  // 10
  [
    { op: 'mul', a: [101, 899], b: [11, 39] },
    { op: 'div', a: [6, 60], b: [12, 40] },
    { op: 'square', a: [31, 60] },
  ],
];

/** Roughly how long a fluent answer takes, by operation and level. */
const OP_EFFORT: Record<Op, number> = {
  add: 0.8,
  sub: 0.9,
  add3: 1.1,
  mul: 1.25,
  div: 1.35,
  square: 1.0,
};

function targetMsFor(op: Op, level: number): number {
  return Math.round((4000 + level * 1300) * OP_EFFORT[op]);
}

/** 47 × 6 = 40×6 + 7×6 = 240 + 42 — how you'd actually do it in your head. */
function explainMultiplication(a: number, b: number): string {
  const [big, small] = a >= b ? [a, b] : [b, a];
  const tens = Math.floor(big / 10) * 10;
  const ones = big - tens;
  if (tens === 0 || ones === 0) return `${a} × ${b} = ${a * b}`;
  return `${big} × ${small} = ${tens}×${small} + ${ones}×${small} = ${tens * small} + ${ones * small} = ${big * small}`;
}

function build(plan: Plan, rng: Rng): { question: string; answer: number; explain?: string } {
  const a = rng.int(plan.a[0], plan.a[1]);
  const bRange = plan.b ?? plan.a;
  const b = rng.int(bRange[0], bRange[1]);

  switch (plan.op) {
    case 'add':
      return { question: `${a} + ${b} = ?`, answer: a + b };

    case 'sub': {
      // Keep the result positive; these are warm-ups, not sign drills.
      const [big, small] = a >= b ? [a, b] : [b, a];
      return { question: `${big} − ${small} = ?`, answer: big - small };
    }

    case 'add3': {
      const c = rng.int(plan.a[0], plan.a[1]);
      return { question: `${a} + ${b} + ${c} = ?`, answer: a + b + c };
    }

    case 'mul':
      return {
        question: `${a} × ${b} = ?`,
        answer: a * b,
        explain: explainMultiplication(a, b),
      };

    case 'div': {
      // `a` is the quotient, `b` the divisor — so this divides evenly.
      const dividend = a * b;
      return {
        question: `${dividend} ÷ ${b} = ?`,
        answer: a,
        explain: `${a} × ${b} = ${dividend}, so ${dividend} ÷ ${b} = ${a}`,
      };
    }

    case 'square':
      return {
        question: `${a}² = ?`,
        answer: a * a,
        explain: explainMultiplication(a, a),
      };
  }
}

const arithmetic: Exercise = {
  kind: 'arithmetic',
  family: 'math',
  label: 'Arithmetic',

  generate(level: number, rng: Rng): ExerciseInstance {
    const plan = rng.pick(byLevel(LEVEL_PLANS, level));
    const { question, answer, explain } = build(plan, rng);
    const expected = String(answer);

    return {
      kind: 'arithmetic',
      family: 'math',
      level,
      question,
      answerKind: 'number',
      expected,
      check: (input) => normalizeNumber(input) === normalizeNumber(expected),
      targetMs: targetMsFor(plan.op, level),
      ...(explain ? { explain } : {}),
    };
  },
};

export default arithmetic;
