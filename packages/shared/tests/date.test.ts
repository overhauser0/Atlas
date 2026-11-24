import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  addCalendarDays,
  formatJaDateWithWeekday,
  getCalendarDateKey,
  getDateFullString,
  getDateShortString,
  getMonthIndexFromDate,
  getThisWeekMondayDateKey,
  getYearFromDate,
  isOverdue,
  isPastDate,
  shiftDateKey,
  toDateKey,
  toLocalDate,
} from '../src/date';

describe('@atlas/shared/date', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('converts ISO timestamps into JST calendar date keys', () => {
    expect(getCalendarDateKey('2026-01-25T15:30:00Z')).toBe('2026-01-26');
    expect(getCalendarDateKey('2026-01-26')).toBe('2026-01-26');
    expect(getCalendarDateKey(null)).toBeNull();
    expect(getCalendarDateKey('invalid-date')).toBeNull();
  });

  it('adds calendar days across month and leap-year boundaries', () => {
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('calculates Monday date key for any day of the week in JST', () => {
    // 2026-01-25 is Sunday in JST -> Monday of that week is 2026-01-19
    expect(getThisWeekMondayDateKey(new Date('2026-01-25T12:00:00+09:00'))).toBe(
      '2026-01-19',
    );
    // 2026-01-26 is Monday in JST -> Monday is 2026-01-26
    expect(getThisWeekMondayDateKey(new Date('2026-01-26T00:30:00+09:00'))).toBe(
      '2026-01-26',
    );
  });

  it('evaluates isOverdue and isPastDate relative to JST today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T10:00:00+09:00')); // Wed, Monday is 2026-01-26

    expect(isOverdue(null)).toBe(true);
    expect(isOverdue('2026-01-25')).toBe(true);
    expect(isOverdue('2026-01-26')).toBe(false);

    expect(isPastDate(null)).toBe(false);
    expect(isPastDate('2026-01-27')).toBe(true);
    expect(isPastDate('2026-01-28')).toBe(false);
  });

  it('parses and shifts local date keys cleanly', () => {
    const parsed = toLocalDate('2026-11-22');
    expect(parsed).not.toBeNull();
    expect(toDateKey(parsed!)).toBe('2026-11-22');
    expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(getYearFromDate('2026-11-22')).toBe(2026);
    expect(getMonthIndexFromDate('2026-11-22')).toBe(10);
    expect(getMonthIndexFromDate('2026-13-01')).toBeNull();
  });

  it('formats dates in Japanese and separator variants', () => {
    expect(formatJaDateWithWeekday('2026-11-22', 'long')).toBe(
      '2026年11月22日 (日)',
    );
    expect(formatJaDateWithWeekday('2026-11-22', 'short')).toBe('11/22 (日)');

    const instant = new Date('2026-05-03T15:00:00Z'); // 2026-05-04 00:00 JST
    expect(getDateFullString(instant, 'slash')).toBe('2026/05/04');
    expect(getDateFullString(instant, 'hyphen')).toBe('2026-05-04');
    expect(getDateFullString(instant, 'none')).toBe('20260504');
    expect(getDateShortString(instant, 'hyphen')).toBe('05-04');
  });
});
