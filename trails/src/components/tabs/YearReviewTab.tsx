'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Beer,
  Calendar,
  Camera,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LandPlot,
  Lightbulb,
  MapPin,
  Mountain,
  Newspaper,
  Notebook,
  Plane,
  Sparkles,
  Star,
  Tags,
  TrendingDown,
  TrendingUp,
  Wine,
} from 'lucide-react';
import { DiaryItem, ItemTabPreset, LifeItem, Views } from '@/types';
import { atlasFetch } from '@/lib/api';
import { useImmichStats } from '@/hooks/useImmichStats';
import JapanMapWidget from '@/components/JapanMapWidget';
import ListItem from '@/components/ui/ListItem';
import PageHeader from '@/components/ui/PageHeader';
import {
  formatJaDateWithWeekday,
  getMonthIndexFromDate,
  getYearFromDate,
  toDateKey,
} from '@/utils/date';
import { sortByStartDate } from '@/utils/piece';
import { normalizePref } from '@/utils/prefecture';

interface YearReviewTabProps {
  items: LifeItem[];
  onNavigate: (tab: Views) => void;
  onItemClick: (item: LifeItem) => void;
  onDiaryClick: (diary: DiaryItem) => void;
  onOpenDailyPhoto: (date: string) => void;
}

type MonthlyMetric = 'events' | 'photos' | 'diary';

const MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
];

const TOPIC_META: {
  preset: ItemTabPreset;
  label: string;
  icon: React.ReactNode;
  barClass: string;
  badgeClass: string;
}[] = [
  {
    preset: 'Travel',
    label: 'Travel',
    icon: <Plane className="w-4 h-4" />,
    barClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 text-sky-600',
  },
  {
    preset: 'Drinking',
    label: 'Drinking',
    icon: <Beer className="w-4 h-4" />,
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-600',
  },
  {
    preset: 'Climbing',
    label: 'Climbing',
    icon: <Mountain className="w-4 h-4" />,
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    preset: 'R-Escape',
    label: 'R-Escape',
    icon: <Lightbulb className="w-4 h-4" />,
    barClass: 'bg-violet-500',
    badgeClass: 'bg-violet-50 text-violet-600',
  },
  {
    preset: 'Golf',
    label: 'Golf',
    icon: <LandPlot className="w-4 h-4" />,
    barClass: 'bg-lime-500',
    badgeClass: 'bg-lime-50 text-lime-700',
  },
  {
    preset: 'Article',
    label: 'Article',
    icon: <Newspaper className="w-4 h-4" />,
    barClass: 'bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  {
    preset: 'Liqueur',
    label: 'Liqueur',
    icon: <Wine className="w-4 h-4" />,
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-600',
  },
  {
    preset: 'Bucket',
    label: 'Bucket (Done)',
    icon: <Archive className="w-4 h-4" />,
    barClass: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-600',
  },
  {
    preset: 'Task',
    label: 'Task (Done)',
    icon: <CheckSquare className="w-4 h-4" />,
    barClass: 'bg-teal-500',
    badgeClass: 'bg-teal-50 text-teal-600',
  },
];

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

  // 選択中の年の日記を1年分取得
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
      const data = await res.json();
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

  // 選択可能な年一覧を算出
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    items.forEach((item) => {
      const y = getYearFromDate(item.start_date);
      if (y) years.add(y);
    });
    if (immichStats?.dailyCounts) {
      Object.keys(immichStats.dailyCounts).forEach((dateStr) => {
        const y = getYearFromDate(dateStr);
        if (y) years.add(y);
      });
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [items, immichStats?.dailyCounts, currentYear]);

  const minYear = availableYears[availableYears.length - 1] ?? currentYear;
  const maxYear = availableYears[0] ?? currentYear;

  // LifeItem 年別集計
  const itemSummary = useMemo(() => {
    const yearStr = String(selectedYear);
    const prevYearStr = String(selectedYear - 1);

    const yearItems = items.filter(
      (item) => item.start_date?.slice(0, 4) === yearStr,
    );
    const prevYearItems = items.filter(
      (item) => item.start_date?.slice(0, 4) === prevYearStr,
    );

    const yearEvents = yearItems.filter((item) => item.type === 'Event');
    const prevYearEvents = prevYearItems.filter(
      (item) => item.type === 'Event',
    );
    const yearDoneTasks = yearItems.filter(
      (item) => item.type === 'Task' && item.status === 'Done',
    );

    // 月別イベント数
    const monthlyEvents = Array(12).fill(0) as number[];
    yearEvents.forEach((item) => {
      const m = getMonthIndexFromDate(item.start_date);
      if (m !== null) monthlyEvents[m] += 1;
    });

    // トピック別集計
    const topicCounts = TOPIC_META.map((meta) => {
      let count = 0;
      if (meta.preset === 'Task') {
        count = yearDoneTasks.length;
      } else if (meta.preset === 'Bucket') {
        count = yearItems.filter(
          (item) =>
            item.category?.includes('Bucket') && item.status === 'Done',
        ).length;
      } else {
        count = yearItems.filter((item) =>
          item.topics?.includes(meta.preset),
        ).length;
      }
      return { ...meta, count };
    }).sort((a, b) => b.count - a.count);

    const maxTopicCount = Math.max(1, ...topicCounts.map((t) => t.count));

    // 都道府県集計（前年以前との比較で「今年初めて行った県」も算出）
    const visitedPrefSet = new Set<string>();
    yearEvents.forEach((item) => {
      (item.prefs || []).forEach((pref) => {
        if (pref) visitedPrefSet.add(normalizePref(pref));
      });
    });

    const priorPrefSet = new Set<string>();
    items.forEach((item) => {
      if (item.type !== 'Event') return;
      const y = getYearFromDate(item.start_date);
      if (y !== null && y < selectedYear) {
        (item.prefs || []).forEach((pref) => {
          if (pref) priorPrefSet.add(normalizePref(pref));
        });
      }
    });

    const firstTimePrefs = Array.from(visitedPrefSet).filter(
      (pref) => !priorPrefSet.has(pref),
    );

    // キーワード（fkw）集計
    const keywordMap = new Map<string, number>();
    yearItems.forEach((item) => {
      (item.fkw || []).forEach((tag) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        keywordMap.set(trimmed, (keywordMap.get(trimmed) ?? 0) + 1);
      });
    });
    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
      .slice(0, 20);

    // その年の主な旅行・Bucket達成ピックアップ
    const bucketAchieved = sortByStartDate(
      yearItems.filter(
        (item) => item.category?.includes('Bucket') && item.status === 'Done',
      ),
      'desc',
    );

    return {
      yearItems,
      yearEvents,
      yearEventCount: yearEvents.length,
      prevYearEventCount: prevYearEvents.length,
      eventDiff: yearEvents.length - prevYearEvents.length,
      yearDoneTaskCount: yearDoneTasks.length,
      monthlyEvents,
      topicCounts,
      maxTopicCount,
      visitedPrefsCount: visitedPrefSet.size,
      firstTimePrefs,
      hasPriorPrefHistory: priorPrefSet.size > 0,
      topKeywords,
      bucketAchieved,
    };
  }, [items, selectedYear]);

  // Diary 集計
  const diarySummary = useMemo(() => {
    const recorded = diaries.filter(
      (d) => d.content.trim() !== '' || d.rate !== null,
    );
    const rated = diaries.filter(
      (d): d is DiaryItem & { rate: number } => typeof d.rate === 'number',
    );
    const avgRate =
      rated.length > 0
        ? rated.reduce((sum, d) => sum + d.rate, 0) / rated.length
        : null;

    const rateCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    rated.forEach((d) => {
      if (d.rate >= 1 && d.rate <= 5) {
        rateCounts[d.rate] += 1;
      }
    });

    const monthlyRateSums = Array(12).fill(0) as number[];
    const monthlyRateCounts = Array(12).fill(0) as number[];
    rated.forEach((d) => {
      const m = getMonthIndexFromDate(d.date);
      if (m !== null) {
        monthlyRateSums[m] += d.rate;
        monthlyRateCounts[m] += 1;
      }
    });
    const monthlyAvgRates = monthlyRateSums.map((sum, idx) =>
      monthlyRateCounts[idx] > 0
        ? Number((sum / monthlyRateCounts[idx]).toFixed(2))
        : 0,
    );

    // ハイライト（flag === true の日記は個人情報保護のため除外し、rate === 5 を優先）
    const publicRecorded = recorded.filter((d) => !d.flag);
    const topRated = publicRecorded
      .filter((d) => d.rate === 5)
      .sort((a, b) => b.date.localeCompare(a.date));

    const highlights =
      topRated.length > 0
        ? topRated.slice(0, 6)
        : [...publicRecorded]
            .sort(
              (a, b) =>
                (b.rate ?? 0) - (a.rate ?? 0) || b.date.localeCompare(a.date),
            )
            .slice(0, 6);

    return {
      recordedCount: recorded.length,
      ratedCount: rated.length,
      avgRate,
      rateCounts,
      monthlyAvgRates,
      highlights,
    };
  }, [diaries]);

  // Immich 写真集計
  const photoSummary = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    const dailyCounts = immichStats?.dailyCounts || {};
    const monthlyPhotos = Array(12).fill(0) as number[];
    const dayEntries: { date: string; count: number }[] = [];

    let totalPhotos = 0;
    Object.entries(dailyCounts).forEach(([dateStr, count]) => {
      if (!dateStr.startsWith(yearPrefix) || count <= 0) return;
      totalPhotos += count;
      dayEntries.push({ date: dateStr, count });
      const m = getMonthIndexFromDate(dateStr);
      if (m !== null) monthlyPhotos[m] += count;
    });

    const topPhotoDays = dayEntries
      .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))
      .slice(0, 5);

    // 指定年の1月1日〜12月31日のヒートマップ用セル生成
    const jan1 = new Date(selectedYear, 0, 1);
    const dec31 = new Date(selectedYear, 11, 31);
    const leadingBlanks = jan1.getDay();
    const cells: ({ date: string; count: number } | null)[] = Array(
      leadingBlanks,
    ).fill(null);

    const cursor = new Date(jan1);
    while (cursor <= dec31) {
      const key = toDateKey(cursor);
      cells.push({ date: key, count: dailyCounts[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      totalPhotos,
      shootingDays: dayEntries.length,
      monthlyPhotos,
      topPhotoDays,
      heatmapCells: cells,
    };
  }, [immichStats?.dailyCounts, selectedYear]);

  // 月別チャート用データ
  const monthlyChart = useMemo(() => {
    if (monthlyMetric === 'photos') {
      const values = photoSummary.monthlyPhotos;
      const max = Math.max(1, ...values);
      return {
        values,
        max,
        unit: '枚',
        barColor: 'bg-emerald-500',
        mutedColor: 'bg-emerald-200',
        formatValue: (v: number) => (v > 0 ? v.toLocaleString() : ''),
      };
    }
    if (monthlyMetric === 'diary') {
      const values = diarySummary.monthlyAvgRates;
      return {
        values,
        max: 5,
        unit: '★',
        barColor: 'bg-amber-500',
        mutedColor: 'bg-amber-200',
        formatValue: (v: number) => (v > 0 ? v.toFixed(1) : ''),
      };
    }
    const values = itemSummary.monthlyEvents;
    const max = Math.max(1, ...values);
    return {
      values,
      max,
      unit: '件',
      barColor: 'bg-primary-500',
      mutedColor: 'bg-primary-200',
      formatValue: (v: number) => (v > 0 ? String(v) : ''),
    };
  }, [
    monthlyMetric,
    photoSummary.monthlyPhotos,
    diarySummary.monthlyAvgRates,
    itemSummary.monthlyEvents,
  ]);

  const peakMonthlyValue = Math.max(...monthlyChart.values, 0);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 5) return 'bg-emerald-200';
    if (count <= 15) return 'bg-emerald-300';
    if (count <= 30) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 space-y-6">
        {/* ヘッダー & 年切替 */}
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

        {/* 年クイック選択ピル（複数年がある場合） */}
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

        {/* KPI サマリー（4カード） */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Events */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500">
                <Calendar className="w-5 h-5" />
              </div>
              {itemSummary.prevYearEventCount > 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    itemSummary.eventDiff > 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : itemSummary.eventDiff < 0
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {itemSummary.eventDiff > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : itemSummary.eventDiff < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : null}
                  {itemSummary.eventDiff > 0
                    ? `+${itemSummary.eventDiff}`
                    : itemSummary.eventDiff === 0
                      ? '±0'
                      : itemSummary.eventDiff}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Events
              </p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                {itemSummary.yearEventCount}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                完了タスク {itemSummary.yearDoneTaskCount}件
              </p>
            </div>
          </div>

          {/* Prefectures */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
                <MapPin className="w-5 h-5" />
              </div>
              {itemSummary.hasPriorPrefHistory &&
                itemSummary.firstTimePrefs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600">
                    初訪問 +{itemSummary.firstTimePrefs.length}
                  </span>
                )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Prefectures
              </p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                {itemSummary.visitedPrefsCount}
                <span className="text-sm font-bold text-gray-400 ml-1">
                  / 47
                </span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">訪れた都道府県</p>
            </div>
          </div>

          {/* Diary */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                <Notebook className="w-5 h-5" />
              </div>
              {diarySummary.avgRate !== null && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {diarySummary.avgRate.toFixed(1)}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Diary
              </p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                {isDiariesLoading ? '-' : diarySummary.recordedCount}
                <span className="text-sm font-bold text-gray-400 ml-1">日</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {diarySummary.ratedCount > 0
                  ? `評価済み ${diarySummary.ratedCount}日`
                  : '記録日数'}
              </p>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                <Camera className="w-5 h-5" />
              </div>
              {photoSummary.shootingDays > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
                  {photoSummary.shootingDays}日撮影
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Photos
              </p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                {isImmichLoading
                  ? '-'
                  : photoSummary.totalPhotos.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Immich 年間撮影数
              </p>
            </div>
          </div>
        </section>

        {/* 月別アクティビティグラフ */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Monthly Rhythm
              </p>
              <h2 className="text-lg font-bold text-gray-900">
                月別アクティビティ
              </h2>
            </div>

            <div className="inline-flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
              {(
                [
                  { id: 'events', label: 'Events' },
                  { id: 'photos', label: 'Photos' },
                  { id: 'diary', label: 'Diary ★' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMonthlyMetric(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    monthlyMetric === tab.id
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-44 pt-6">
            {monthlyChart.values.map((val, idx) => {
              const heightPct =
                val > 0 ? Math.max(8, Math.round((val / monthlyChart.max) * 100)) : 0;
              const isPeak = val > 0 && val === peakMonthlyValue;
              return (
                <div
                  key={MONTH_LABELS[idx]}
                  className="flex flex-col items-center h-full justify-end gap-1.5"
                  title={`${selectedYear}年${idx + 1}月: ${val}${monthlyChart.unit}`}
                >
                  <span className="text-[10px] font-semibold text-gray-400 tabular-nums h-4">
                    {monthlyChart.formatValue(val)}
                  </span>
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-8 rounded-t-lg transition-all duration-500 ${
                        val === 0
                          ? 'bg-gray-100 h-1 rounded-b-lg'
                          : isPeak
                            ? monthlyChart.barColor
                            : monthlyChart.mutedColor
                      }`}
                      style={val > 0 ? { height: `${heightPct}%` } : undefined}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      isPeak ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {idx + 1}月
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* トピック内訳 & 日本地図 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* トピック別内訳 */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Categories
              </p>
              <h2 className="text-lg font-bold text-gray-900">
                トピック別ハイライト
              </h2>
            </div>

            {itemSummary.topicCounts.every((t) => t.count === 0) ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {selectedYear}年の記録はまだありません
              </div>
            ) : (
              <div className="space-y-3">
                {itemSummary.topicCounts
                  .filter((t) => t.count > 0)
                  .map((topic) => {
                    const percent = Math.round(
                      (topic.count / itemSummary.maxTopicCount) * 100,
                    );
                    return (
                      <button
                        key={topic.preset}
                        type="button"
                        onClick={() => onNavigate(topic.preset)}
                        className="w-full text-left group rounded-2xl p-2 -mx-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${topic.badgeClass}`}
                            >
                              {topic.icon}
                            </span>
                            <span className="text-sm font-bold text-gray-800 group-hover:text-gray-950 truncate">
                              {topic.label}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gray-600 tabular-nums shrink-0">
                            {topic.count}件
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${topic.barClass}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Bucket List 達成アイテム */}
            {itemSummary.bucketAchieved.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Bucket List Achieved ({itemSummary.bucketAchieved.length})
                </p>
                <div className="divide-y divide-gray-100 -mx-2">
                  {itemSummary.bucketAchieved.slice(0, 5).map((item) => (
                    <ListItem
                      key={item.id}
                      item={item}
                      icon="BadgeCheck"
                      iconClassName="text-emerald-500"
                      slim
                      onItemClick={() => onItemClick(item)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* その年の日本地図 */}
          <div className="space-y-4">
            <JapanMapWidget
              data={itemSummary.yearEvents}
              onItemClick={onItemClick}
              subtitle={`${selectedYear} Japan Map`}
              title="Footprints"
              headerRight={
                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold tabular-nums">
                  {itemSummary.visitedPrefsCount} / 47
                </span>
              }
            />

            {itemSummary.hasPriorPrefHistory &&
              itemSummary.firstTimePrefs.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                    First Visit in {selectedYear}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {itemSummary.firstTimePrefs.map((pref) => (
                      <span
                        key={pref}
                        className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold"
                      >
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Diary ハイライト */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Diary Reflections
              </p>
              <h2 className="text-lg font-bold text-gray-900">
                日記ハイライト
              </h2>
            </div>
            {diarySummary.avgRate !== null && (
              <div className="text-right">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  平均 ★ {diarySummary.avgRate.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {isDiariesLoading ? (
            <div className="py-10 text-center text-sm text-gray-400 animate-pulse">
              日記データを読み込み中...
            </div>
          ) : diariesError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500 mb-3">
                日記データの取得に失敗しました
              </p>
              <button
                type="button"
                onClick={() => void fetchYearDiaries(selectedYear)}
                className="text-xs font-bold text-primary-600 hover:underline"
              >
                再読み込み
              </button>
            </div>
          ) : diarySummary.recordedCount === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {selectedYear}年の日記記録はありません
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Rate 分布 */}
              <div className="lg:col-span-4 space-y-2.5">
                <p className="text-xs font-bold text-gray-500 mb-3">
                  Rate 分布（{diarySummary.ratedCount}件）
                </p>
                {[5, 4, 3, 2, 1].map((rate) => {
                  const count = diarySummary.rateCounts[rate] || 0;
                  const pct =
                    diarySummary.ratedCount > 0
                      ? Math.round((count / diarySummary.ratedCount) * 100)
                      : 0;
                  return (
                    <div key={rate} className="flex items-center gap-3">
                      <span className="w-10 text-xs font-bold text-amber-500 shrink-0">
                        ★{rate}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold text-gray-500 tabular-nums shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ベスト日記（Flaggedは非表示） */}
              <div className="lg:col-span-8">
                <p className="text-xs font-bold text-gray-500 mb-3">
                  Best Days
                </p>
                {diarySummary.highlights.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    表示対象の日記はありません
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {diarySummary.highlights.map((diary) => (
                      <button
                        key={diary.date}
                        type="button"
                        onClick={() => onDiaryClick(diary)}
                        className="text-left p-4 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-primary-50/40 hover:border-primary-200 transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            {formatJaDateWithWeekday(diary.date, 'short')}
                          </span>
                          {diary.rate && (
                            <span className="text-[11px] font-bold text-amber-500">
                              {'★'.repeat(diary.rate)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                          {diary.content.trim() || '（テキストなし）'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Photo ハイライト (Immich) */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Immich Memories
              </p>
              <h2 className="text-lg font-bold text-gray-900">
                写真ハイライト
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('Photo')}
              className="text-xs font-bold text-primary-600 hover:text-primary-700"
            >
              Immich を見る →
            </button>
          </div>

          {isImmichLoading ? (
            <div className="py-8 text-center text-sm text-gray-400 animate-pulse">
              写真統計を読み込み中...
            </div>
          ) : photoSummary.totalPhotos === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {selectedYear}年の撮影データはありません
            </div>
          ) : (
            <>
              {/* 年間撮影ヒートマップ */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500">
                    {selectedYear} 撮影ヒートマップ
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span>Less</span>
                    <span className="w-2.5 h-2.5 rounded-xs bg-gray-100" />
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200" />
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                    <span>More</span>
                  </div>
                </div>
                <div className="overflow-x-auto no-scrollbar pb-1">
                  <div className="w-max">
                    <div className="grid grid-rows-7 grid-flow-col gap-1">
                      {photoSummary.heatmapCells.map((cell, idx) =>
                        cell === null ? (
                          <div key={`blank-${idx}`} className="w-2.5 h-2.5" />
                        ) : (
                          <button
                            key={cell.date}
                            type="button"
                            title={`${cell.date}: ${cell.count} photos`}
                            onClick={() =>
                              cell.count > 0 && onOpenDailyPhoto(cell.date)
                            }
                            className={`w-2.5 h-2.5 rounded-xs transition-transform ${
                              cell.count > 0
                                ? 'hover:scale-125 cursor-pointer'
                                : 'cursor-default'
                            } ${getHeatmapColor(cell.count)}`}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 最も撮影した日 Top 5 */}
              {photoSummary.topPhotoDays.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-3">
                    一番写真を撮った日 Top {photoSummary.topPhotoDays.length}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {photoSummary.topPhotoDays.map((day, idx) => (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => onOpenDailyPhoto(day.date)}
                        className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 w-5 h-5 rounded-full flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-800">
                            {formatJaDateWithWeekday(day.date, 'short')}
                          </span>
                        </div>
                        <span className="text-sm font-black text-gray-900 sm:mt-1 tabular-nums">
                          {day.count.toLocaleString()}
                          <span className="text-[11px] font-medium text-gray-400 ml-0.5">
                            枚
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* キーワード (fkw) */}
        {itemSummary.topKeywords.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                <Tags className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Keywords
                </p>
                <h2 className="text-lg font-bold text-gray-900 leading-none">
                  {selectedYear}年のキーワード
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {itemSummary.topKeywords.map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                >
                  <span>#{tag}</span>
                  {count > 1 && (
                    <span className="text-[10px] font-bold text-gray-400">
                      ×{count}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
