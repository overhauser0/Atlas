import type { DiaryItem, ItemTabPreset, LifeItem } from '../../../types';
import {
  getMonthIndexFromDate,
  getYearFromDate,
  toDateKey,
} from '@atlas/shared/date';
import { sortByStartDate } from '../../../utils/piece';
import { normalizePref } from '../../../utils/prefecture';

export type MonthlyMetric = 'events' | 'photos' | 'diary';

export const MONTH_LABELS = [
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
] as const;

export interface TopicMeta {
  preset: ItemTabPreset;
  label: string;
  barClass: string;
  badgeClass: string;
}

export const TOPIC_META: TopicMeta[] = [
  {
    preset: 'Travel',
    label: 'Travel',
    barClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 text-sky-600',
  },
  {
    preset: 'Drinking',
    label: 'Drinking',
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-600',
  },
  {
    preset: 'Climbing',
    label: 'Climbing',
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    preset: 'R-Escape',
    label: 'R-Escape',
    barClass: 'bg-violet-500',
    badgeClass: 'bg-violet-50 text-violet-600',
  },
  {
    preset: 'Golf',
    label: 'Golf',
    barClass: 'bg-lime-500',
    badgeClass: 'bg-lime-50 text-lime-700',
  },
  {
    preset: 'Article',
    label: 'Article',
    barClass: 'bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  {
    preset: 'Liqueur',
    label: 'Liqueur',
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-600',
  },
  {
    preset: 'Bucket',
    label: 'Bucket (Done)',
    barClass: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-600',
  },
  {
    preset: 'Task',
    label: 'Task (Done)',
    barClass: 'bg-teal-500',
    badgeClass: 'bg-teal-50 text-teal-600',
  },
];

export interface TopicCountItem extends TopicMeta {
  count: number;
}

export interface YearItemSummary {
  yearItems: LifeItem[];
  yearEvents: LifeItem[];
  yearEventCount: number;
  prevYearEventCount: number;
  eventDiff: number;
  yearDoneTaskCount: number;
  monthlyEvents: number[];
  topicCounts: TopicCountItem[];
  maxTopicCount: number;
  visitedPrefsCount: number;
  firstTimePrefs: string[];
  hasPriorPrefHistory: boolean;
  topKeywords: [string, number][];
  bucketAchieved: LifeItem[];
}

export interface YearDiarySummary {
  recordedCount: number;
  ratedCount: number;
  avgRate: number | null;
  rateCounts: Record<number, number>;
  monthlyAvgRates: number[];
  highlights: DiaryItem[];
}

export interface YearPhotoSummary {
  totalPhotos: number;
  shootingDays: number;
  monthlyPhotos: number[];
  topPhotoDays: { date: string; count: number }[];
  heatmapCells: ({ date: string; count: number } | null)[];
}

export interface MonthlyChartData {
  values: number[];
  max: number;
  unit: string;
  barColor: string;
  mutedColor: string;
  formatValue: (value: number) => string;
}

/** 選択可能な年一覧（降順）を算出する */
export const computeAvailableYears = (
  items: LifeItem[],
  dailyCounts: Record<string, number> | undefined,
  currentYear: number,
): number[] => {
  const years = new Set<number>([currentYear]);
  items.forEach((item) => {
    const y = getYearFromDate(item.start_date);
    if (y) years.add(y);
  });
  if (dailyCounts) {
    Object.keys(dailyCounts).forEach((dateStr) => {
      const y = getYearFromDate(dateStr);
      if (y) years.add(y);
    });
  }
  return Array.from(years).sort((a, b) => b - a);
};

/** LifeItem の年間サマリーを算出する */
export const computeItemSummary = (
  items: LifeItem[],
  selectedYear: number,
): YearItemSummary => {
  const yearStr = String(selectedYear);
  const prevYearStr = String(selectedYear - 1);

  const yearItems = items.filter(
    (item) => item.start_date?.slice(0, 4) === yearStr,
  );
  const prevYearItems = items.filter(
    (item) => item.start_date?.slice(0, 4) === prevYearStr,
  );

  const yearEvents = yearItems.filter((item) => item.type === 'Event');
  const prevYearEvents = prevYearItems.filter((item) => item.type === 'Event');
  const yearDoneTasks = yearItems.filter(
    (item) => item.type === 'Task' && item.status === 'Done',
  );

  const monthlyEvents = Array(12).fill(0) as number[];
  yearEvents.forEach((item) => {
    const m = getMonthIndexFromDate(item.start_date);
    if (m !== null) monthlyEvents[m] += 1;
  });

  const topicCounts: TopicCountItem[] = TOPIC_META.map((meta) => {
    let count = 0;
    if (meta.preset === 'Task') {
      count = yearDoneTasks.length;
    } else if (meta.preset === 'Bucket') {
      count = yearItems.filter(
        (item) => item.category?.includes('Bucket') && item.status === 'Done',
      ).length;
    } else {
      count = yearItems.filter((item) =>
        item.topics?.includes(meta.preset),
      ).length;
    }
    return { ...meta, count };
  }).sort((a, b) => b.count - a.count);

  const maxTopicCount = Math.max(1, ...topicCounts.map((t) => t.count));

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
};

/** 日記の年間サマリーを算出する（flag === true はハイライトから除外） */
export const computeDiarySummary = (diaries: DiaryItem[]): YearDiarySummary => {
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
};

/** Immich 写真の年間サマリーとヒートマップセルを算出する */
export const computePhotoSummary = (
  dailyCounts: Record<string, number> | undefined,
  selectedYear: number,
): YearPhotoSummary => {
  const yearPrefix = `${selectedYear}-`;
  const counts = dailyCounts || {};
  const monthlyPhotos = Array(12).fill(0) as number[];
  const dayEntries: { date: string; count: number }[] = [];

  let totalPhotos = 0;
  Object.entries(counts).forEach(([dateStr, count]) => {
    if (!dateStr.startsWith(yearPrefix) || count <= 0) return;
    totalPhotos += count;
    dayEntries.push({ date: dateStr, count });
    const m = getMonthIndexFromDate(dateStr);
    if (m !== null) monthlyPhotos[m] += count;
  });

  const topPhotoDays = dayEntries
    .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))
    .slice(0, 5);

  const jan1 = new Date(selectedYear, 0, 1);
  const dec31 = new Date(selectedYear, 11, 31);
  const leadingBlanks = jan1.getDay();
  const heatmapCells: ({ date: string; count: number } | null)[] = Array(
    leadingBlanks,
  ).fill(null);

  const cursor = new Date(jan1);
  while (cursor <= dec31) {
    const key = toDateKey(cursor);
    heatmapCells.push({ date: key, count: counts[key] || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    totalPhotos,
    shootingDays: dayEntries.length,
    monthlyPhotos,
    topPhotoDays,
    heatmapCells,
  };
};

/** 月別アクティビティチャート用の描画データを算出する */
export const computeMonthlyChartData = (
  metric: MonthlyMetric,
  monthlyEvents: number[],
  monthlyPhotos: number[],
  monthlyAvgRates: number[],
): MonthlyChartData => {
  if (metric === 'photos') {
    const max = Math.max(1, ...monthlyPhotos);
    return {
      values: monthlyPhotos,
      max,
      unit: '枚',
      barColor: 'bg-emerald-500',
      mutedColor: 'bg-emerald-200',
      formatValue: (v) => (v > 0 ? v.toLocaleString() : ''),
    };
  }
  if (metric === 'diary') {
    return {
      values: monthlyAvgRates,
      max: 5,
      unit: '★',
      barColor: 'bg-amber-500',
      mutedColor: 'bg-amber-200',
      formatValue: (v) => (v > 0 ? v.toFixed(1) : ''),
    };
  }
  const max = Math.max(1, ...monthlyEvents);
  return {
    values: monthlyEvents,
    max,
    unit: '件',
    barColor: 'bg-primary-500',
    mutedColor: 'bg-primary-200',
    formatValue: (v) => (v > 0 ? String(v) : ''),
  };
};
