import { describe, expect, it } from 'vitest';
import { decideLevel, decideLevels, summarize } from './leveling.ts';
import type { AttemptResult, Family, SessionRecord } from './types.ts';

const TARGET = 10_000;

function attempt(
  family: Family,
  correct: boolean,
  ms = TARGET / 2,
  level = 5,
): AttemptResult {
  return {
    kind: family === 'math' ? 'arithmetic' : 'digit-span',
    family,
    level,
    question: 'q',
    expected: 'a',
    given: correct ? 'a' : 'b',
    correct,
    ms,
    targetMs: TARGET,
  };
}

/** A finished session with `correct` of 3 math answers right, at `ms` each. */
function session(date: string, correct: number, ms = TARGET / 2): SessionRecord {
  const results: AttemptResult[] = [];
  for (let i = 0; i < 3; i += 1) results.push(attempt('math', i < correct, ms));
  for (let i = 0; i < 2; i += 1) results.push(attempt('memory', i < correct, ms));
  return {
    date,
    levelsAtStart: { math: 5, memory: 5 },
    results,
    completed: true,
  };
}

describe('summarize', () => {
  it('returns null when the family did not appear', () => {
    expect(summarize([attempt('math', true)], 'memory')).toBeNull();
  });

  it('computes accuracy and the median time ratio', () => {
    const outcome = summarize(
      [
        attempt('math', true, 5_000),
        attempt('math', true, 10_000),
        attempt('math', false, 20_000),
      ],
      'math',
    );
    expect(outcome?.answered).toBe(3);
    expect(outcome?.correct).toBe(2);
    expect(outcome?.accuracy).toBeCloseTo(2 / 3);
    expect(outcome?.medianRatio).toBe(1);
  });

  it('averages the middle two ratios for an even count', () => {
    const outcome = summarize(
      [attempt('math', true, 2_000), attempt('math', true, 8_000)],
      'math',
    );
    expect(outcome?.medianRatio).toBeCloseTo(0.5);
  });

  it('ignores the other family', () => {
    const outcome = summarize([attempt('math', true), attempt('memory', false)], 'math');
    expect(outcome?.accuracy).toBe(1);
  });
});

describe('decideLevel', () => {
  it('holds with no history', () => {
    const decision = decideLevel(5, [], 'math');
    expect(decision).toMatchObject({ level: 5, direction: 'hold' });
  });

  it('holds after a single good session — one day is not a trend', () => {
    const decision = decideLevel(5, [session('2026-09-25', 3)], 'math');
    expect(decision.direction).toBe('hold');
    expect(decision.level).toBe(5);
  });

  it('moves up after two accurate, quick sessions', () => {
    const history = [session('2026-09-24', 3), session('2026-09-25', 3)];
    const decision = decideLevel(5, history, 'math');
    expect(decision.direction).toBe('up');
    expect(decision.level).toBe(6);
    expect(decision.reason).toMatch(/moving up/i);
  });

  it('holds when accurate but slow, and says so', () => {
    const slow = TARGET * 1.6;
    const history = [session('2026-09-24', 3, slow), session('2026-09-25', 3, slow)];
    const decision = decideLevel(5, history, 'math');
    expect(decision.direction).toBe('hold');
    expect(decision.reason).toMatch(/slow/i);
  });

  it('moves down after one weak session', () => {
    const history = [session('2026-09-24', 3), session('2026-09-25', 1)];
    const decision = decideLevel(5, history, 'math');
    expect(decision.direction).toBe('down');
    expect(decision.level).toBe(4);
  });

  it('never moves more than one level at a time', () => {
    const history = Array.from({ length: 6 }, (_, i) => session(`2026-09-2${i}`, 3));
    expect(decideLevel(5, history, 'math').level).toBe(6);
  });

  it('cannot fall below level 1', () => {
    const history = [session('2026-09-25', 0)];
    const decision = decideLevel(1, history, 'math');
    expect(decision.level).toBe(1);
    expect(decision.direction).toBe('hold');
  });

  it('cannot rise above level 10', () => {
    const history = [session('2026-09-24', 3), session('2026-09-25', 3)];
    const decision = decideLevel(10, history, 'math');
    expect(decision.level).toBe(10);
    expect(decision.direction).toBe('hold');
  });

  it('ignores unfinished sessions', () => {
    const abandoned: SessionRecord = { ...session('2026-09-25', 0), completed: false };
    const history = [session('2026-09-23', 3), session('2026-09-24', 3), abandoned];
    expect(decideLevel(5, history, 'math').direction).toBe('up');
  });

  it('judges the two families independently', () => {
    const mixed: SessionRecord = {
      date: '2026-09-25',
      levelsAtStart: { math: 5, memory: 5 },
      completed: true,
      results: [
        attempt('math', true),
        attempt('math', true),
        attempt('math', true),
        attempt('memory', false),
        attempt('memory', false),
      ],
    };
    const decisions = decideLevels({ math: 5, memory: 5 }, [mixed, mixed]);
    expect(decisions.math.direction).toBe('up');
    expect(decisions.memory.direction).toBe('down');
  });

  it('reports accuracy as a percentage in its reason', () => {
    const decision = decideLevel(5, [session('2026-09-25', 2)], 'math');
    expect(decision.reason).toMatch(/67% correct/);
  });
});
