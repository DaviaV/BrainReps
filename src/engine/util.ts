/**
 * Indexed access that fails loudly. With `noUncheckedIndexedAccess` every
 * lookup is `T | undefined`; the difficulty tables in `exercises/` are all
 * indexed by a clamped level, so a miss is a bug in the table, not input we
 * should quietly paper over.
 */
export function at<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) {
    throw new RangeError(`Index ${index} out of range (length ${items.length})`);
  }
  return value;
}

/** Table lookup by 1-based level, clamped to the table's ends. */
export function byLevel<T>(table: readonly T[], level: number): T {
  const index = Math.min(table.length - 1, Math.max(0, Math.round(level) - 1));
  return at(table, index);
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/** Digits only, so '4 9 1 7', '4917' and '4-9-1-7' all compare equal. */
export function digitsOnly(input: string): string {
  return input.replace(/\D+/g, '');
}

/** A number as a comparable string: handles spaces, thousands separators, unicode minus. */
export function normalizeNumber(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[−–—]/g, '-')
    .replace(/[\s,'’]/g, '')
    .replace(/^\+/, '')
    .replace(/,/g, '.');
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) return cleaned.toLowerCase();
  // Collapse -0, 007 and 3.50 to a single canonical form.
  const value = Number(cleaned);
  return Number.isFinite(value) ? String(value) : cleaned;
}

export function normalizeText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Words a person typed, in no particular order, de-duplicated. */
export function normalizeWords(input: string): string[] {
  const words = normalizeText(input)
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length > 0);
  return [...new Set(words)];
}
