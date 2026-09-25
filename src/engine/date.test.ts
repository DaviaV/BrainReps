import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isYesterday, today, toDateString } from './date.ts';

describe('toDateString', () => {
  it('formats local calendar days with padding', () => {
    expect(toDateString(new Date(2026, 8, 25))).toBe('2026-09-25');
    expect(toDateString(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('uses the local day, not UTC — late evening is still today', () => {
    // 23:30 local on the 25th must not roll forward to the 26th.
    expect(toDateString(new Date(2026, 8, 25, 23, 30))).toBe('2026-09-25');
    expect(toDateString(new Date(2026, 8, 25, 0, 5))).toBe('2026-09-25');
  });

  it('today() reads the date it is given', () => {
    expect(today(new Date(2026, 8, 25, 9, 0))).toBe('2026-09-25');
  });
});

describe('addDays', () => {
  it('moves forwards and backwards', () => {
    expect(addDays('2026-09-25', 1)).toBe('2026-09-26');
    expect(addDays('2026-09-25', -1)).toBe('2026-09-24');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });
});

describe('daysBetween', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-09-25', '2026-09-26')).toBe(1);
    expect(daysBetween('2026-09-25', '2026-09-25')).toBe(0);
    expect(daysBetween('2026-09-26', '2026-09-25')).toBe(-1);
    expect(daysBetween('2026-09-01', '2026-10-01')).toBe(30);
  });

  it('is unaffected by daylight saving changes', () => {
    // Late March and late October are when European clocks shift.
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1);
    expect(daysBetween('2026-10-24', '2026-10-25')).toBe(1);
  });
});

describe('isYesterday', () => {
  it('is true only for the immediately preceding day', () => {
    expect(isYesterday('2026-09-24', '2026-09-25')).toBe(true);
    expect(isYesterday('2026-09-23', '2026-09-25')).toBe(false);
    expect(isYesterday('2026-09-25', '2026-09-25')).toBe(false);
  });
});
