import type { Rng } from './types.ts';

/**
 * Deterministic pseudo-random source. Seeded from the calendar date so that
 * today's five questions are the same all day — reloading the page can't
 * reroll a question you don't like, and tests stay stable.
 */

/** FNV-1a. Small, fast, and good enough to spread nearby seeds apart. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // hash * 16777619, kept in 32 bits.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32: 32-bit state, good distribution, four lines long. */
export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`Rng.int: max ${max} below min ${min}`);
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    // Non-empty checked above, so the index is always populated.
    return items[int(0, items.length - 1)] as T;
  };

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  };

  return { next, int, pick, shuffle };
}

/** Seed for question `index` of `date`, kept stable across reloads. */
export function seedFor(date: string, index: number, kind: string): string {
  return `${date}|${index}|${kind}`;
}
