import { describe, it, expect } from 'vitest';
import type { DiaryItem, LifeItem } from '../../../../types';
import {
  computeAvailableYears,
  computeDiarySummary,
  computeItemSummary,
  computeMonthlyChartData,
  computePhotoSummary,
} from '../computeYearReview';

const makeItem = (overrides: Partial<LifeItem>): LifeItem => ({
  id: 'id-1',
  title: 'Sample',
  status: 'Done',
  start_date: '2026-05-01',
  area: 'Life',
  type: 'Event',
  topics: [],
  flags: [],
  note: '',
  url: '',
  fkw: [],
  prefs: [],
  imageUrl: '',
  iconType: 'Calendar',
  source: 'LOCAL',
  ...overrides,
});

describe('computeYearReview', () => {
  it('computes sorted available years from items, photos, and currentYear', () => {
    const items = [makeItem({ start_date: '2024-07-01' })];
    const dailyCounts = { '2025-03-10': 5 };
    expect(computeAvailableYears(items, dailyCounts, 2026)).toEqual([
      2026, 2025, 2024,
    ]);
  });

  it('computes item summaries including first-time prefectures and top keywords', () => {
    const items: LifeItem[] = [
      makeItem({
        id: 'prior-1',
        start_date: '2025-08-01',
        prefs: ['東京都'],
      }),
      makeItem({
        id: 'ev-1',
        start_date: '2026-02-10',
        topics: ['Travel'],
        prefs: ['東京都', '北海道'],
        fkw: ['温泉', 'ラーメン'],
      }),
      makeItem({
        id: 'ev-2',
        start_date: '2026-02-20',
        topics: ['Travel', 'Drinking'],
        prefs: ['北海道'],
        fkw: ['温泉'],
        category: ['Bucket'],
        status: 'Done',
      }),
      makeItem({
        id: 'task-1',
        start_date: '2026-03-01',
        type: 'Task',
        status: 'Done',
      }),
    ];

    const summary = computeItemSummary(items, 2026);
    expect(summary.yearEventCount).toBe(2);
    expect(summary.prevYearEventCount).toBe(1);
    expect(summary.eventDiff).toBe(1);
    expect(summary.yearDoneTaskCount).toBe(1);
    expect(summary.monthlyEvents[1]).toBe(2); // February
    expect(summary.visitedPrefsCount).toBe(2);
    expect(summary.hasPriorPrefHistory).toBe(true);
    expect(summary.firstTimePrefs).toEqual(['北海道']);
    expect(summary.topKeywords[0]).toEqual(['温泉', 2]);
    expect(summary.bucketAchieved).toHaveLength(1);
  });

  it('computes diary stats and excludes flagged diaries from public highlights', () => {
    const diaries: DiaryItem[] = [
      {
        date: '2026-01-10',
        rate: 5,
        content: 'Secret great day',
        flag: true,
        piece_ids: [],
      },
      {
        date: '2026-01-15',
        rate: 5,
        content: 'Public great day',
        flag: false,
        piece_ids: [],
      },
      {
        date: '2026-02-01',
        rate: 3,
        content: 'Normal day',
        flag: false,
        piece_ids: [],
      },
    ];

    const summary = computeDiarySummary(diaries);
    expect(summary.recordedCount).toBe(3);
    expect(summary.ratedCount).toBe(3);
    expect(summary.avgRate).toBeCloseTo(13 / 3, 5);
    expect(summary.rateCounts[5]).toBe(2);
    expect(summary.rateCounts[3]).toBe(1);
    expect(summary.monthlyAvgRates[0]).toBe(5);
    expect(summary.monthlyAvgRates[1]).toBe(3);
    expect(summary.highlights.map((d) => d.date)).toEqual(['2026-01-15']);
  });

  it('computes photo summaries and monthly chart data', () => {
    const photoSummary = computePhotoSummary(
      { '2026-01-01': 12, '2026-01-05': 30, '2025-12-31': 99 },
      2026,
    );
    expect(photoSummary.totalPhotos).toBe(42);
    expect(photoSummary.shootingDays).toBe(2);
    expect(photoSummary.monthlyPhotos[0]).toBe(42);
    expect(photoSummary.topPhotoDays[0]).toEqual({
      date: '2026-01-05',
      count: 30,
    });
    // 2026 has 365 days plus leading blanks for Jan 1 (Thursday = 4)
    expect(photoSummary.heatmapCells.length).toBe(365 + 4);

    const chart = computeMonthlyChartData(
      'photos',
      Array(12).fill(0),
      photoSummary.monthlyPhotos,
      Array(12).fill(0),
    );
    expect(chart.max).toBe(42);
    expect(chart.unit).toBe('枚');
  });
});
