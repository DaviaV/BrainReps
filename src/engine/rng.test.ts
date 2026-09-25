import { describe, expect, it } from 'vitest';
import { createRng, hashString, seedFor } from './rng.ts';

describe('createRng', () => {
  it('produces the same stream for the same seed', () => {
    const a = createRng('2026-09-25|0|arithmetic');
    const b = createRng('2026-09-25|0|arithmetic');
    const drawA = Array.from({ length: 20 }, () => a.next());
    const drawB = Array.from({ length: 20 }, () => b.next());
    expect(drawA).toEqual(drawB);
  });

  it('produces different streams for different seeds', () => {
    const a = createRng('2026-09-25|0|arithmetic');
    const b = createRng('2026-09-26|0|arithmetic');
    expect(a.next()).not.toBe(b.next());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int is inclusive of both bounds and never out of range', () => {
    const rng = createRng('bounds');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = rng.int(3, 7);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('int handles a single-value range', () => {
    expect(createRng('one').int(5, 5)).toBe(5);
  });

  it('int rejects an inverted range', () => {
    expect(() => createRng('bad').int(9, 2)).toThrow();
  });

  it('pick rejects an empty array', () => {
    expect(() => createRng('empty').pick([])).toThrow();
  });

  it('shuffle keeps every element exactly once', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = createRng('shuffle').shuffle(input);
    expect(output).toHaveLength(input.length);
    expect([...output].sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffle does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5];
    createRng('nomutate').shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('hashString', () => {
  it('is stable and spreads nearby inputs apart', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('2026-09-25')).not.toBe(hashString('2026-09-26'));
  });

  it('stays a 32-bit unsigned integer', () => {
    for (const input of ['', 'a', 'a much longer seed string', '2026-09-25|4|pairs']) {
      const hash = hashString(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('seedFor', () => {
  it('varies by date, index and kind', () => {
    const seeds = new Set([
      seedFor('2026-09-25', 0, 'arithmetic'),
      seedFor('2026-09-25', 1, 'arithmetic'),
      seedFor('2026-09-26', 0, 'arithmetic'),
      seedFor('2026-09-25', 0, 'percent'),
    ]);
    expect(seeds.size).toBe(4);
  });
});
