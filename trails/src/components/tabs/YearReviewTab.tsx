'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { DiaryItem, LifeItem, Views } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { useImmichStats } from '@/hooks/useImmichStats';
import PageHeader from '@/components/ui/PageHeader';
import {
  computeAvailableYears,
  computeDiarySummary,
  computeItemSummary,
  computeMonthlyChartData,
  computePhotoSummary,
  type MonthlyMetric,
} from './year-review/computeYearReview';
import YearReviewKpiGrid from './year-review/YearReviewKpiGrid';
import MonthlyActivityChart from './year-review/MonthlyActivityChart';
import TopicAndMapSection from './year-review/TopicAndMapSection';
import DiaryPhotoHighlights from './year-review/DiaryPhotoHighlights';

interface YearReviewTabProps {
  items: LifeItem[];
  onNavigate: (tab: Views) => void;
  onItemClick: (item: LifeItem) => void;
  onDiaryClick: (diary: DiaryItem) => void;
  onOpenDailyPhoto: (date: string) => void;
}

export default function YearReviewTab({
  items,
  onNavigate,
  onItemClick,
  onDiaryClick,
  onOpenDailyPhoto,
}: YearReviewTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyMetric, setMonthlyMetric] = useState<MonthlyMetric>('events');
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [isDiariesLoading, setIsDiariesLoading] = useState(true);
  const [diariesError, setDiariesError] = useState(false);

  const { stats: immichStats, isLoading: isImmichLoading } = useImmichStats();

  const fetchYearDiaries = useCallback(async (year: number) => {
    setIsDiariesLoading(true);
    setDiariesError(false);
    try {
      const params = new URLSearchParams({
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      });
      const res = await atlasFetch(`/diaries?${params.toString()}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`Failed to fetch diaries (${res.status})`);
      const data: { diaries?: DiaryItem[] } = await res.json();
      setDiaries(Array.isArray(data.diaries) ? data.diaries : []);
    } catch (e) {
      console.error('Failed to fetch yearly diaries:', e);
      setDiaries([]);
      setDiariesError(true);
    } finally {
      setIsDiariesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchYearDiaries(selectedYear);
  }, [selectedYear, fetchYearDiaries]);

  useEffect(() => {
    const handleRefreshDiaries = () => {
      void fetchYearDiaries(selectedYear);
    };
    window.addEventListener('refresh_diaries', handleRefreshDiaries);
    return () => {
      window.removeEventListener('refresh_diaries', handleRefreshDiaries);
    };
  }, [selectedYear, fetchYearDiaries]);

  const availableYears = useMemo(
    () =>
      computeAvailableYears(items, immichStats?.dailyCounts, currentYear),
    [items, immichStats?.dailyCounts, currentYear],
  );

  const minYear = availableYears[availableYears.length - 1] ?? currentYear;
  const maxYear = availableYears[0] ?? currentYear;

  const itemSummary = useMemo(
    () => computeItemSummary(items, selectedYear),
    [items, selectedYear],
  );
  const diarySummary = useMemo(() => computeDiarySummary(diaries), [diaries]);
  const photoSummary = useMemo(
    () => computePhotoSummary(immichStats?.dailyCounts, selectedYear),
    [immichStats?.dailyCounts, selectedYear],
  );
  const monthlyChart = useMemo(
    () =>
      computeMonthlyChartData(
        monthlyMetric,
        itemSummary.monthlyEvents,
        photoSummary.monthlyPhotos,
        diarySummary.monthlyAvgRates,
      ),
    [
      monthlyMetric,
      itemSummary.monthlyEvents,
      photoSummary.monthlyPhotos,
      diarySummary.monthlyAvgRates,
    ],
  );

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 space-y-6">
        <PageHeader
          icon={<Sparkles />}
          title="Year in Review"
          subtitle={`${selectedYear}年の振り返り`}
          className="mb-0"
          actions={
            <>
              {selectedYear !== currentYear && (
                <button
                  type="button"
                  onClick={() => setSelectedYear(currentYear)}
                  className="trails-nav-btn"
                >
                  今年
                </button>
              )}
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="前の年"
                  disabled={selectedYear <= minYear}
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="trails-nav-icon-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-14 text-center text-sm font-black text-gray-900 tabular-nums">
                  {selectedYear}
                </span>
                <button
                  type="button"
                  aria-label="次の年"
                  disabled={selectedYear >= maxYear}
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="trails-nav-icon-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          }
        />

        {availableYears.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {availableYears.map((year) => {
              const isActive = year === selectedYear;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-xs'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-gray-800'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        )}

        <YearReviewKpiGrid
          itemSummary={itemSummary}
          diarySummary={diarySummary}
          photoSummary={photoSummary}
          isDiariesLoading={isDiariesLoading}
          isImmichLoading={isImmichLoading}
        />

        <MonthlyActivityChart
          selectedYear={selectedYear}
          monthlyMetric={monthlyMetric}
          onChangeMetric={setMonthlyMetric}
          chart={monthlyChart}
        />

        <TopicAndMapSection
          selectedYear={selectedYear}
          itemSummary={itemSummary}
          onNavigate={onNavigate}
          onItemClick={onItemClick}
        />

        <DiaryPhotoHighlights
          selectedYear={selectedYear}
          diarySummary={diarySummary}
          photoSummary={photoSummary}
          topKeywords={itemSummary.topKeywords}
          isDiariesLoading={isDiariesLoading}
          diariesError={diariesError}
          isImmichLoading={isImmichLoading}
          onRetryDiaries={() => void fetchYearDiaries(selectedYear)}
          onDiaryClick={onDiaryClick}
          onNavigate={onNavigate}
          onOpenDailyPhoto={onOpenDailyPhoto}
        />
      </div>
    </div>
  );
}
