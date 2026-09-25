import type { Exercise, ExerciseInstance, Rng } from '../types.ts';
import { byLevel, gcd, normalizeNumber } from '../util.ts';

type Variant = 'of' | 'whichPercent' | 'discount' | 'tip' | 'successive';

interface LevelSpec {
  variants: readonly Variant[];
  percents: readonly number[];
  base: readonly [number, number];
}

const LEVELS: readonly LevelSpec[] = [
  { variants: ['of'], percents: [10, 50], base: [40, 200] },
  { variants: ['of'], percents: [10, 25, 50], base: [40, 400] },
  { variants: ['of', 'whichPercent'], percents: [10, 20, 25, 50], base: [40, 400] },
  { variants: ['of', 'whichPercent'], percents: [10, 20, 25, 75], base: [60, 600] },
  { variants: ['of', 'whichPercent', 'discount'], percents: [5, 15, 30, 40], base: [60, 600] },
  { variants: ['of', 'discount', 'tip'], percents: [5, 15, 30, 60], base: [80, 800] },
  { variants: ['of', 'discount', 'tip'], percents: [12, 18, 35, 45], base: [100, 900] },
  { variants: ['whichPercent', 'discount', 'tip'], percents: [12, 18, 35, 45], base: [100, 1200] },
  { variants: ['of', 'tip', 'successive'], percents: [7, 13, 17, 22], base: [200, 1600] },
  { variants: ['whichPercent', 'successive', 'tip'], percents: [7, 13, 17, 38], base: [200, 2000] },
];

/**
 * A base value in roughly [min, max] for which `percent` of it is a whole
 * number — 15% of 240 is 36, but 15% of 241 is 36.15, and nobody does that in
 * their head on purpose.
 */
function pickWholeBase(rng: Rng, percent: number, min: number, max: number): number {
  const step = 100 / gcd(percent, 100);
  const lowMultiple = Math.max(1, Math.ceil(min / step));
  const highMultiple = Math.max(lowMultiple, Math.floor(max / step));
  return step * rng.int(lowMultiple, highMultiple);
}

const CURRENCY = '€';

function build(
  variant: Variant,
  spec: LevelSpec,
  rng: Rng,
): { question: string; answer: number; explain?: string } {
  const percent = rng.pick(spec.percents);
  const [min, max] = spec.base;

  switch (variant) {
    case 'of': {
      const base = pickWholeBase(rng, percent, min, max);
      return {
        question: `${percent}% of ${base} = ?`,
        answer: (percent * base) / 100,
        explain: `1% of ${base} is ${base / 100}, so ${percent}% is ${percent} × ${base / 100} = ${(percent * base) / 100}`,
      };
    }

    case 'whichPercent': {
      const base = pickWholeBase(rng, percent, min, max);
      const part = (percent * base) / 100;
      return {
        question: `${part} is what % of ${base}?`,
        answer: percent,
        explain: `${part} ÷ ${base} = ${part / base}, which is ${percent}%`,
      };
    }

    case 'discount': {
      const base = pickWholeBase(rng, percent, min, max);
      const off = (percent * base) / 100;
      return {
        question: `A jacket costs ${base}${CURRENCY} with ${percent}% off. What do you pay?`,
        answer: base - off,
        explain: `${percent}% of ${base} is ${off}, and ${base} − ${off} = ${base - off}`,
      };
    }

    case 'tip': {
      const base = pickWholeBase(rng, percent, min, max);
      const tip = (percent * base) / 100;
      return {
        question: `The bill is ${base}${CURRENCY} and you add a ${percent}% tip. What is the total?`,
        answer: base + tip,
        explain: `${percent}% of ${base} is ${tip}, and ${base} + ${tip} = ${base + tip}`,
      };
    }

    case 'successive': {
      // Two clean discounts on a price divisible by 400 always land on a whole
      // number, whichever pair comes up.
      const pair = rng.shuffle([10, 20, 25, 50]).slice(0, 2);
      const first = pair[0] ?? 10;
      const second = pair[1] ?? 20;
      const base = 400 * rng.int(Math.max(1, Math.ceil(min / 400)), Math.max(1, Math.floor(max / 400)));
      const afterFirst = base - (first * base) / 100;
      const afterSecond = afterFirst - (second * afterFirst) / 100;
      return {
        question: `A laptop costs ${base}${CURRENCY}. Take ${first}% off, then ${second}% off the new price. What do you pay?`,
        answer: afterSecond,
        explain: `${base} − ${first}% = ${afterFirst}, then ${afterFirst} − ${second}% = ${afterSecond}`,
      };
    }
  }
}

const percent: Exercise = {
  kind: 'percent',
  family: 'math',
  label: 'Percentages',

  generate(level: number, rng: Rng): ExerciseInstance {
    const spec = byLevel(LEVELS, level);
    const variant = rng.pick(spec.variants);
    const { question, answer, explain } = build(variant, spec, rng);
    const expected = String(answer);

    return {
      kind: 'percent',
      family: 'math',
      level,
      question,
      answerKind: 'number',
      expected,
      check: (input) => normalizeNumber(input) === normalizeNumber(expected),
      targetMs: 5000 + level * 1500,
      ...(explain ? { explain } : {}),
    };
  },
};

export default percent;
