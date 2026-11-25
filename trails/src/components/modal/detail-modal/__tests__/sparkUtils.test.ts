import { describe, it, expect } from 'vitest';
import {
  filterSparksForItem,
  formatDateRangeChipLabel,
  formatSparkTimestampForBody,
  normalizeTimeForApi,
  normalizeTimeForInput,
  type SparkItem,
} from '../sparkUtils';

const sampleSparks: SparkItem[] = [
  {
    id: 's1',
    content: 'Before trip',
    recorded_at: '2026-11-19T09:00:00+09:00',
    target_date: '2026-11-19',
  },
  {
    id: 's2',
    content: 'Day 1 lunch',
    recorded_at: '2026-11-20T12:15:00+09:00',
    target_date: '2026-11-20',
  },
  {
    id: 's3',
    content: 'Day 2 dinner',
    recorded_at: '2026-11-21T19:45:00+09:00',
    target_date: '2026-11-21',
  },
  {
    id: 's4',
    content: 'Day 3 souvenir',
    recorded_at: '2026-11-22T15:05:00+09:00',
    target_date: '2026-11-22',
  },
  {
    id: 's5',
    content: 'After trip',
    recorded_at: '2026-11-23T10:00:00+09:00',
    target_date: '2026-11-23',
  },
];

describe('DetailModal sparkUtils', () => {
  describe('filterSparksForItem', () => {
    it('filters to a single day when only startDate is provided', () => {
      const result = filterSparksForItem(sampleSparks, {
        startDate: '2026-11-20',
        endDate: null,
        mode: 'range',
      });
      expect(result.map((s) => s.id)).toEqual(['s2']);
    });

    it('filters inclusively across startDate..endDate range', () => {
      const result = filterSparksForItem(sampleSparks, {
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        mode: 'range',
      });
      expect(result.map((s) => s.id)).toEqual(['s2', 's3', 's4']);
    });

    it('returns all sparks when mode is all or startDate is missing', () => {
      expect(
        filterSparksForItem(sampleSparks, {
          startDate: '2026-11-20',
          endDate: '2026-11-22',
          mode: 'all',
        }).map((s) => s.id),
      ).toEqual(['s1', 's2', 's3', 's4', 's5']);

      expect(
        filterSparksForItem(sampleSparks, {
          startDate: null,
          endDate: null,
          mode: 'range',
        }).map((s) => s.id),
      ).toEqual(['s1', 's2', 's3', 's4', 's5']);
    });
  });

  describe('formatSparkTimestampForBody', () => {
    it('formats ISO datetime as YYYY-MM-DD HH:mm in JST', () => {
      expect(formatSparkTimestampForBody('2026-11-24T14:30:00+09:00')).toBe(
        '2026-11-24 14:30',
      );
      // UTC 16:05 -> JST next day 01:05
      expect(formatSparkTimestampForBody('2026-11-24T16:05:00Z')).toBe(
        '2026-11-25 01:05',
      );
    });

    it('returns undefined for empty or invalid timestamps', () => {
      expect(formatSparkTimestampForBody(null)).toBeUndefined();
      expect(formatSparkTimestampForBody('not-a-date')).toBeUndefined();
    });
  });

  describe('time normalization & range label', () => {
    it('normalizes time strings for input and API', () => {
      expect(normalizeTimeForInput('14:30:00')).toBe('14:30');
      expect(normalizeTimeForInput('09:05')).toBe('09:05');
      expect(normalizeTimeForInput(null)).toBe('');

      expect(normalizeTimeForApi('14:30')).toBe('14:30:00');
      expect(normalizeTimeForApi('14:30:45')).toBe('14:30:45');
      expect(normalizeTimeForApi('')).toBeNull();
    });

    it('formats single-day and multi-day range chip labels', () => {
      expect(formatDateRangeChipLabel('2026-11-24', null)).toBe('11/24');
      expect(formatDateRangeChipLabel('2026-11-24', '2026-11-24')).toBe(
        '11/24',
      );
      expect(formatDateRangeChipLabel('2026-11-20', '2026-11-22')).toBe(
        '11/20〜11/22',
      );
    });
  });
});
