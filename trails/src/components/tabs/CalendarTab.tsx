'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Notebook,
  Aperture,
} from 'lucide-react';
import { DiaryItem, LifeItem, TrailsAppSettings } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import {
  getDateShortString,
  getDateFullString,
  toLocalDate,
} from '@atlas/shared/date';
import CalendarItem from '@/components/ui/CalendarItem';
import PageHeader from '@/components/ui/PageHeader';
import { getStatusColor } from '@/utils/piece';

interface CalendarTabProps {
  appSettings: TrailsAppSettings;
  onUpdateSettings: (newSettings: TrailsAppSettings) => void;
  data: LifeItem[];
  task: LifeItem[];
  diaries: DiaryItem[];
  onDiaryMonthChange: (
    startDate: string,
    endDate: string,
  ) => Promise<boolean>;
  googleEvents: GoogleEvent[];
  onItemClick: (item: LifeItem) => void;
  onDiaryClick: (diary: DiaryItem | null) => void;
  onOpenCreate: (item: Partial<LifeItem>) => void;
  onOpenDairyPhoto: (date: string) => void;
  isDetailModalOpen: boolean;
  isDiaryModalOpen: boolean;
}

export default function CalendarTab({
  appSettings,
  onUpdateSettings,
  data,
  task,
  diaries,
  onDiaryMonthChange,
  googleEvents,
  onItemClick,
  onDiaryClick,
  onOpenCreate,
  onOpenDairyPhoto,
  isDetailModalOpen,
  isDiaryModalOpen,
}: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const setBottomScrollRef = useCallback((element: HTMLDivElement | null) => {
    bottomScrollRef.current = element;
  }, []);

  const showTasks = !!appSettings?.showTaskInCal;
  const showGcal = !!appSettings?.showGcalInCal;

  // ========== 描画用データの内部結合 ==========
  const calendarItems = useMemo(() => {
    const gcalItems: LifeItem[] = (googleEvents || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      note: ev.note || '',
      start_date: ev.start_date,
      start_time: ev.start_time,
      end_date: ev.end_date,
      end_time: ev.end_time,
      type: 'Event',
      url: ev.url || '',
      status: '',
      area: '',
      topics: [],
      flags: [],
      fkw: [],
      prefs: [],
      imageUrl: '',
      iconType: 'Calendar',
      category: [],
      source: 'GCAL',
    }));

    let combined = [...data];
    if (showTasks && task) combined = [...combined, ...task];
    if (showGcal && gcalItems) combined = [...combined, ...gcalItems];

    return combined;
  }, [data, task, googleEvents, showTasks, showGcal]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStart = getDateFullString(new Date(year, month, 1), 'hyphen');
  const monthEnd = getDateFullString(new Date(year, month + 1, 0), 'hyphen');
  const [loadedDiaryMonth, setLoadedDiaryMonth] = useState<string | null>(null);
  const [diaryMonthLoadError, setDiaryMonthLoadError] = useState(false);
  const [diaryRetryCount, setDiaryRetryCount] = useState(0);
  const visibleDiaries =
    loadedDiaryMonth === monthKey ? diaries : [];

  // カレンダー移動系のハンドラ
  const changeMonth = useCallback(
    (offset: number) => {
      const nextMonth = new Date(year, month + offset, 1);
      setLoadedDiaryMonth(null);
      setCurrentDate(nextMonth);
      setSelectedDate((date) => {
        const lastDay = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth() + 1,
          0,
        ).getDate();
        return new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          Math.min(date.getDate(), lastDay),
        );
      });
    },
    [year, month],
  );
  const prevMonth = useCallback(() => changeMonth(-1), [changeMonth]);
  const nextMonth = useCallback(() => changeMonth(1), [changeMonth]);
  const goToToday = () => {
    const today = new Date();
    if (
      today.getFullYear() !== year ||
      today.getMonth() !== month
    ) {
      setLoadedDiaryMonth(null);
    }
    setCurrentDate(today);
    setSelectedDate(today);
  };

  useEffect(() => {
    let isCurrent = true;
    setDiaryMonthLoadError(false);
    onDiaryMonthChange(monthStart, monthEnd).then((success) => {
      if (!isCurrent) return;
      if (success) {
        setLoadedDiaryMonth(monthKey);
      } else {
        setDiaryMonthLoadError(true);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [
    monthKey,
    monthStart,
    monthEnd,
    onDiaryMonthChange,
    diaryRetryCount,
  ]);

  // 選択日が変わったら下部リストを一番上にスクロール
  useEffect(() => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollTop = 0;
    }
  }, [selectedDate]);

  // カレンダーグリッドの計算（6週間）
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  // アイテムから日付を取得するヘルパー
  const getItemDate = (item: LifeItem): Date | null => {
    const fallbackCreatedAt =
      'createdAt' in item && typeof item.createdAt === 'string'
        ? item.createdAt
        : null;
    return toLocalDate(item.start_date || fallbackCreatedAt);
  };

  // 特定の日のアイテムを取得し、タスクを上にする
  const getItemsForDate = (date: Date) => {
    const filtered = calendarItems.filter((item) => {
      const itemDate = getItemDate(item);
      if (!itemDate) return false;
      return (
        itemDate.getFullYear() === date.getFullYear() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getDate() === date.getDate()
      );
    });
    return filtered.sort((a, b) => {
      const aIsTask = a.type === 'Task' ? 1 : 0;
      const bIsTask = b.type === 'Task' ? 1 : 0;
      return bIsTask - aIsTask;
    });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  // ====== 選択中の日のデータ取得 ======
  const selectedDateStr = getDateFullString(selectedDate, 'hyphen');
  const selectedDayItems = getItemsForDate(selectedDate);
  const selectedDayDiary =
    visibleDiaries.find((diary) => diary.date === selectedDateStr) || null;
  const isSelectedEntered = !!(
    selectedDayDiary &&
    selectedDayDiary.content.trim() !== ''
  );

  // ショートカットキー
  useEffect(() => {
    if (isDetailModalOpen || isDiaryModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevMonth();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextMonth();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailModalOpen, isDiaryModalOpen, prevMonth, nextMonth]);

  return (
    <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-3 pt-3 pb-3 md:px-8 md:pt-8 md:pb-6">
      <PageHeader
        icon={<CalendarIcon />}
        title={
          <>
            Monthly<span className="hidden sm:inline"> Calendar</span>
          </>
        }
        subtitle={`${year}年${month + 1}月`}
        nowrap
        className="mb-2.5 md:mb-4"
        actions={
          <>
            <div className="hidden items-center gap-1.5 md:flex">
              {/* タスク表示トグル */}
              <button
                type="button"
                role="switch"
                aria-checked={showTasks}
                onClick={() =>
                  onUpdateSettings({
                    ...appSettings,
                    showTaskInCal: !showTasks,
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  showTasks
                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    showTasks ? 'bg-teal-500' : 'bg-gray-300'
                  }`}
                />
                Tasks
              </button>
              {/* Google表示トグル */}
              <button
                type="button"
                role="switch"
                aria-checked={showGcal}
                onClick={() =>
                  onUpdateSettings({
                    ...appSettings,
                    showGcalInCal: !showGcal,
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  showGcal
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    showGcal ? 'bg-indigo-500' : 'bg-gray-300'
                  }`}
                />
                Google
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={goToToday}
                className="trails-nav-btn"
              >
                今日
              </button>
              <button
                type="button"
                aria-label="前の月"
                onClick={prevMonth}
                className="trails-nav-icon-btn"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="次の月"
                onClick={nextMonth}
                className="trails-nav-icon-btn"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden md:gap-4 lg:flex-row lg:gap-5">
        {/* =========================================
            上部 / 左側：カレンダーエリア
            ========================================= */}
        <section className="trails-card flex h-[64%] min-w-0 shrink-0 flex-col overflow-hidden lg:h-full lg:flex-[7]">
          {/* 曜日ヘッダー */}
          <div className="grid shrink-0 grid-cols-7 border-b border-gray-100 bg-gray-50/80">
            {weekDays.map((day, idx) => (
              <div
                key={day}
                className={`py-1.5 text-center text-[10px] font-bold uppercase tracking-wider md:py-2 md:text-xs ${
                  idx === 0
                    ? 'text-rose-400'
                    : idx === 6
                      ? 'text-sky-500'
                      : 'text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド本体 */}
          <div className="flex-1 overflow-y-auto bg-gray-100 no-scrollbar">
            <div className="grid min-h-full grid-cols-7 auto-rows-[minmax(54px,1fr)] gap-px md:auto-rows-[minmax(90px,1fr)]">
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isToday =
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();

                const isSelected =
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                const dayItems = getItemsForDate(date);

                // 日記ステータスの判定
                const dateStr = getDateFullString(date, 'hyphen');
                const dayDiary =
                  visibleDiaries.find((diary) => diary.date === dateStr) ||
                  null;
                const isEntered = !!(
                  dayDiary && dayDiary.content.trim() !== ''
                );

                // スタイリング
                const dayBgColor = isSelected
                  ? 'bg-primary-50/60'
                  : isCurrentMonth
                    ? 'bg-white hover:bg-gray-50/70'
                    : 'bg-gray-50/60 hover:bg-gray-50';

                const weekdayIdx = idx % 7;
                const dateTextColor = isToday
                  ? 'bg-primary-500 font-bold text-white'
                  : !isCurrentMonth
                    ? 'text-gray-300'
                    : weekdayIdx === 0
                      ? 'text-rose-500'
                      : weekdayIdx === 6
                        ? 'text-sky-600'
                        : 'text-gray-700';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(date);
                      if (!isCurrentMonth) {
                        setLoadedDiaryMonth(null);
                        setCurrentDate(
                          new Date(date.getFullYear(), date.getMonth(), 1),
                        );
                      }
                    }}
                    className={`${dayBgColor} relative flex cursor-pointer flex-col p-1 transition-colors md:p-1.5 ${
                      isSelected
                        ? 'z-10 ring-2 ring-inset ring-primary-500'
                        : ''
                    }`}
                  >
                    {/* 日付ラベルと日記ステータス */}
                    <div className="mb-0.5 flex items-center justify-between md:mb-1">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold md:h-6 md:w-6 md:text-xs ${dateTextColor}`}
                      >
                        {date.getDate()}
                      </span>
                      {/* 日記の✓印 */}
                      {isEntered && (
                        <Check className="h-3.5 w-3.5 stroke-[3px] text-emerald-500 md:h-4 md:w-4" />
                      )}
                    </div>

                    {/* 予定リスト（最大4〜5件表示） */}
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <CalendarItem
                        entries={dayItems.slice(0, 5).map((item, i) => {
                          const isGCal = item.source === 'GCAL';
                          const isTask = item.type === 'Task';
                          const is5th = i === 4;

                          const itemStyle = isTask
                            ? 'bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100 hover:border-teal-100'
                            : isGCal
                              ? 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 font-medium';

                          return {
                            id: item.id,
                            title: item.title,
                            status: isGCal ? undefined : item.status,
                            className: `${itemStyle} ${is5th ? 'hidden md:block' : ''}`,
                            item,
                          };
                        })}
                      />

                      {/* 省略テキスト「他...」 */}
                      {dayItems.length > 4 && (
                        <div className="mt-0.5 pl-0.5 text-[9px] leading-none text-gray-400 md:hidden">
                          他...
                        </div>
                      )}
                      {dayItems.length > 5 && (
                        <div className="mt-0.5 hidden pl-0.5 text-[10px] leading-none text-gray-400 md:block">
                          他...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================
            下部 / 右側：1日の詳細エリア
            ========================================= */}
        <section className="trails-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-full lg:flex-[3]">
          {/* 詳細エリア ヘッダー */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 md:px-5 md:py-4">
            <div className="min-w-0">
              <p className="trails-section-label hidden md:block">
                Selected Date
              </p>
              <h2 className="truncate text-base font-bold tracking-tight text-gray-900 md:text-lg">
                {getDateShortString(selectedDateStr)}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenDairyPhoto(selectedDateStr)}
                aria-label="この日の写真を開く"
                title="この日の写真を開く"
                className="trails-nav-icon-btn hover:text-primary-600"
              >
                <Aperture className="h-4 w-4" />
              </button>
              {/* 日記入力 / 閲覧ボタン */}
              {diaryMonthLoadError ? (
                <button
                  type="button"
                  onClick={() => setDiaryRetryCount((count) => count + 1)}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  日記を再取得
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loadedDiaryMonth !== monthKey}
                  onClick={() =>
                    onDiaryClick(
                      selectedDayDiary || {
                        date: selectedDateStr,
                        rate: null,
                        content: '',
                        flag: false,
                        piece_ids: [],
                      },
                    )
                  }
                  aria-label="この日の日記を開く"
                  title="この日の日記を開く"
                  className={`trails-nav-icon-btn ${
                    isSelectedEntered
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'hover:text-primary-600'
                  }`}
                >
                  <Notebook className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 1日の予定リスト */}
          <div
            ref={setBottomScrollRef}
            className="min-h-0 flex-1 overflow-y-auto p-2.5 pb-16 trails-scrollbar md:p-4 md:pb-20"
          >
            {selectedDayItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-sm text-gray-400 md:py-10">
                予定はありません
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 md:gap-2">
                {selectedDayItems.map((item) => {
                  const isGCal = item.source === 'GCAL';
                  const isTask = item.type === 'Task';
                  const timeLabel = item.start_time?.slice(0, 5);

                  const itemStyle = isTask
                    ? 'border-teal-100 bg-teal-50/80 text-teal-800 hover:bg-teal-100/80'
                    : isGCal
                      ? 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      : 'border-indigo-100 bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100/80';

                  return (
                    <button
                      key={`${item.source ?? 'ITEM'}-${item.id}`}
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={`flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors md:gap-3 md:px-3.5 md:py-3 ${itemStyle}`}
                    >
                      {!isGCal && (
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full ${getStatusColor(item.status)}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {item.title}
                        </p>
                        {timeLabel && (
                          <p className="mt-0.5 font-mono text-[11px] opacity-70">
                            {timeLabel}
                            {item.end_time
                              ? ` - ${item.end_time.slice(0, 5)}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* FAB */}
      <button
        type="button"
        aria-label="予定を作成"
        onClick={() =>
          onOpenCreate({
            type: 'Event',
            start_date: getDateFullString(selectedDate),
          } as LifeItem)
        }
        className="absolute bottom-5 right-5 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600 md:bottom-6 md:right-6 md:h-14 md:w-14"
      >
        <Plus className="h-6 w-6 md:h-7 md:w-7" />
      </button>
    </div>
  );
}
