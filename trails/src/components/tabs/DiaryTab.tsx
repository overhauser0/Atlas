'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Notebook,
  PenLine,
  RefreshCw,
} from 'lucide-react';
import { DiaryItem } from '@/types';
import {
  JA_WEEKDAYS,
  getDateFullString,
  toDateKey,
} from '@atlas/shared/date';
import PageHeader from '@/components/ui/PageHeader';

interface DiaryTabProps {
  diaries: DiaryItem[];
  onDiaryMonthChange: (startDate: string, endDate: string) => Promise<boolean>;
  onDiaryClick: (diary: DiaryItem) => void;
  onOpenTodayDiary: () => void;
}

const getRateDotColor = (rate: number | null | undefined) => {
  switch (rate) {
    case 5:
      return 'bg-primary-500';
    case 4:
      return 'bg-emerald-500';
    case 3:
      return 'bg-sky-500';
    case 2:
      return 'bg-orange-400';
    case 1:
      return 'bg-rose-400';
    default:
      return 'bg-gray-300';
  }
};

export default function DiaryTab({
  diaries,
  onDiaryMonthChange,
  onDiaryClick,
  onOpenTodayDiary,
}: DiaryTabProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [onlyWritten, setOnlyWritten] = useState(false);
  const [loadedMonthKey, setLoadedMonthKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStart = getDateFullString(new Date(year, month, 1), 'hyphen');
  const monthEnd = getDateFullString(new Date(year, month + 1, 0), 'hyphen');
  const todayKey = getDateFullString(new Date(), 'hyphen');

  const changeMonth = useCallback(
    (offset: number) => {
      setLoadedMonthKey(null);
      setCurrentDate(new Date(year, month + offset, 1));
    },
    [year, month],
  );

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    if (now.getFullYear() !== year || now.getMonth() !== month) {
      setLoadedMonthKey(null);
    }
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [year, month]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError(false);

    onDiaryMonthChange(monthStart, monthEnd).then((success) => {
      if (!isCurrent) return;
      setIsLoading(false);
      if (success) {
        setLoadedMonthKey(monthKey);
      } else {
        setLoadError(true);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [monthKey, monthStart, monthEnd, onDiaryMonthChange, retryCount]);

  const visibleDiaries = useMemo(
    () => (loadedMonthKey === monthKey ? diaries : []),
    [loadedMonthKey, monthKey, diaries],
  );

  const diaryByDate = useMemo(() => {
    const map = new Map<string, DiaryItem>();
    visibleDiaries.forEach((diary) => {
      map.set(diary.date.slice(0, 10), diary);
    });
    return map;
  }, [visibleDiaries]);

  const monthRows = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = Array.from({ length: daysInMonth }, (_, idx) => {
      const dateObj = new Date(year, month, idx + 1);
      const dateKey = toDateKey(dateObj);
      const weekdayIndex = dateObj.getDay();
      const diary = diaryByDate.get(dateKey) ?? null;
      return {
        dateKey,
        day: idx + 1,
        weekdayIndex,
        weekdayLabel: JA_WEEKDAYS[weekdayIndex],
        isToday: dateKey === todayKey,
        diary,
      };
    });

    if (onlyWritten) {
      return rows.filter(
        (row) =>
          row.diary !== null &&
          (Boolean(row.diary.content?.trim()) ||
            row.diary.rate !== null ||
            Boolean(row.diary.flag)),
      );
    }
    return rows;
  }, [year, month, diaryByDate, todayKey, onlyWritten]);

  const writtenCount = useMemo(
    () =>
      visibleDiaries.filter(
        (d) =>
          Boolean(d.content?.trim()) || d.rate !== null || Boolean(d.flag),
      ).length,
    [visibleDiaries],
  );

  const handleRowClick = (dateKey: string, diary: DiaryItem | null) => {
    onDiaryClick(
      diary ?? {
        date: dateKey,
        rate: null,
        content: '',
        flag: false,
        piece_ids: [],
      },
    );
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-5 pt-5 md:px-8 md:pt-8">
      <PageHeader
        icon={<Notebook />}
        title="Diary"
        subtitle={`${year}年${month + 1}月`}
        nowrap
        className="mb-4"
        actions={
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="trails-nav-btn"
            >
              今月
            </button>
            <button
              type="button"
              aria-label="前の月"
              onClick={() => changeMonth(-1)}
              className="trails-nav-icon-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="次の月"
              onClick={() => changeMonth(1)}
              className="trails-nav-icon-btn"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-gray-200/70 p-0.5">
            <button
              type="button"
              onClick={() => setOnlyWritten(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                !onlyWritten
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              全日
            </button>
            <button
              type="button"
              onClick={() => setOnlyWritten(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                onlyWritten
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              記入済み ({writtenCount})
            </button>
          </div>

          {isLoading && (
            <Loader2
              aria-label="読み込み中"
              className="h-3.5 w-3.5 animate-spin text-gray-400"
            />
          )}
        </div>

        <button
          type="button"
          onClick={onOpenTodayDiary}
          className="trails-btn-primary shrink-0 py-2 text-xs"
        >
          <PenLine className="h-3.5 w-3.5" />
          今日の日記
        </button>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 overflow-y-auto pb-28 md:pb-8 trails-scrollbar">
        {loadError ? (
          <div className="trails-card flex flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="text-sm font-medium text-red-600">
              日記一覧の読み込みに失敗しました
            </p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="trails-btn-secondary text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              再読み込み
            </button>
          </div>
        ) : (
          <div className="trails-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="w-32 whitespace-nowrap px-4 py-3 md:w-36 md:px-5">
                      Date
                    </th>
                    <th className="w-24 whitespace-nowrap px-3 py-3 md:w-28 md:px-4">
                      Rate
                    </th>
                    <th className="px-4 py-3 md:px-5">Content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {monthRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-12 text-center text-sm text-gray-400"
                      >
                        {year}年{month + 1}月の記入済み日記はありません
                      </td>
                    </tr>
                  ) : (
                    monthRows.map((row) => {
                      const isFlagged = Boolean(row.diary?.flag);
                      const hasContent = Boolean(row.diary?.content?.trim());
                      const dateColor =
                        row.weekdayIndex === 0
                          ? 'text-rose-500'
                          : row.weekdayIndex === 6
                            ? 'text-sky-600'
                            : 'text-gray-800';

                      return (
                        <tr
                          key={row.dateKey}
                          onClick={() => handleRowClick(row.dateKey, row.diary)}
                          className={`cursor-pointer transition-colors hover:bg-primary-50/40 ${
                            row.isToday ? 'bg-primary-50/25' : ''
                          }`}
                        >
                          {/* Date */}
                          <td className="whitespace-nowrap px-4 py-3 align-top md:px-5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-xs font-bold md:text-sm ${dateColor}`}
                              >
                                {String(month + 1).padStart(2, '0')}/
                                {String(row.day).padStart(2, '0')}
                              </span>
                              <span
                                className={`text-xs font-medium ${dateColor}`}
                              >
                                ({row.weekdayLabel})
                              </span>
                              {row.isToday && (
                                <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  今日
                                </span>
                              )}
                              {isFlagged && (
                                <Flag
                                  aria-label="Flagged"
                                  className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500"
                                />
                              )}
                            </div>
                          </td>

                          {/* Rate */}
                          <td className="whitespace-nowrap px-3 py-3 align-top md:px-4">
                            {row.diary?.rate ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2 py-0.5 text-xs font-bold text-gray-700">
                                <span
                                  aria-hidden="true"
                                  className={`h-2 w-2 rounded-full ${getRateDotColor(row.diary.rate)}`}
                                />
                                <span>★ {row.diary.rate}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </td>

                          {/* Content */}
                          <td className="px-4 py-3 align-top md:px-5">
                            {isFlagged ? (
                              <span className="font-mono text-xs tracking-widest text-gray-400">
                                ---
                              </span>
                            ) : hasContent ? (
                              <p className="line-clamp-2 whitespace-pre-line break-words text-xs leading-relaxed text-gray-700 md:text-sm">
                                {row.diary?.content}
                              </p>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
