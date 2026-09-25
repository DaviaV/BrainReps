import { describe, expect, it } from 'vitest';
import { buildDailySession, LEVEL_OFFSETS, MIX } from './session.ts';
import { clampLevel, QUESTIONS_PER_SESSION } from './types.ts';
import type { Family } from './types.ts';

const LEVELS: Record<Family, number> = { math: 4, memory: 4 };

describe('buildDailySession', () => {
  it('builds five questions in the configured family order', () => {
    const session = buildDailySession('2026-09-25', LEVELS);
    expect(session).toHaveLength(QUESTIONS_PER_SESSION);
    expect(session.map((instance) => instance.family)).toEqual([...MIX]);
  });

  it('mixes three math and two memory questions', () => {
    const session = buildDailySession('2026-09-25', LEVELS);
    expect(session.filter((i) => i.family === 'math')).toHaveLength(3);
    expect(session.filter((i) => i.family === 'memory')).toHaveLength(2);
  });

  it('ramps from one level below to one above the current level', () => {
    const session = buildDailySession('2026-09-25', LEVELS);
    expect(session.map((instance) => instance.level)).toEqual(
      LEVEL_OFFSETS.map((offset) => clampLevel(4 + offset)),
    );
  });

  it('clamps the ramp at both ends of the scale', () => {
    const atFloor = buildDailySession('2026-09-25', { math: 1, memory: 1 });
    expect(Math.min(...atFloor.map((i) => i.level))).toBe(1);

    const atCeiling = buildDailySession('2026-09-25', { math: 10, memory: 10 });
    expect(Math.max(...atCeiling.map((i) => i.level))).toBe(10);
  });

  it('gives the same five questions for the same day and levels', () => {
    const first = buildDailySession('2026-09-25', LEVELS);
    const second = buildDailySession('2026-09-25', LEVELS);
    expect(second.map((i) => i.question)).toEqual(first.map((i) => i.question));
    expect(second.map((i) => i.expected)).toEqual(first.map((i) => i.expected));
  });

  it('gives different questions on a different day', () => {
    const today = buildDailySession('2026-09-25', LEVELS);
    const tomorrow = buildDailySession('2026-09-26', LEVELS);
    expect(tomorrow.map((i) => i.question)).not.toEqual(today.map((i) => i.question));
  });

  it('never repeats an exercise kind within a family on the same day', () => {
    // Over a stretch of dates, the three math slots should always be three
    // different kinds — three rounds of arithmetic in one session is a bug.
    for (let day = 1; day <= 28; day += 1) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      const session = buildDailySession(date, LEVELS);
      const mathKinds = session.filter((i) => i.family === 'math').map((i) => i.kind);
      const memoryKinds = session.filter((i) => i.family === 'memory').map((i) => i.kind);
      expect(new Set(mathKinds).size, date).toBe(mathKinds.length);
      expect(new Set(memoryKinds).size, date).toBe(memoryKinds.length);
    }
  });

  it('varies which exercise kinds show up across a month', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 28; day += 1) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      for (const instance of buildDailySession(date, LEVELS)) seen.add(instance.kind);
    }
    // All six types should appear over four weeks.
    expect(seen.size).toBe(6);
  });

  it('tracks each family against its own level', () => {
    const session = buildDailySession('2026-09-25', { math: 9, memory: 2 });
    const math = session.filter((i) => i.family === 'math').map((i) => i.level);
    const memory = session.filter((i) => i.family === 'memory').map((i) => i.level);
    expect(Math.min(...math)).toBeGreaterThan(Math.max(...memory));
  });
});
