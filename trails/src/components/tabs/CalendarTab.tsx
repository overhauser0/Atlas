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
import { DiaryItem, LifeItem } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import { getDateShortString, getDateFullString } from '@/utils/dateUtils';
import CalendarItem from '@/components/ui/CalendarItem';

interface CalendarTabProps {
  appSettings: any;
  onUpdateSettings: (newSettings: any) => void;
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
    const gcalItems: any[] = (googleEvents || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      note: ev.note,
      start_date: ev.start_date,
      start_time: ev.start_time,
      end_date: ev.end_date,
      end_time: ev.end_time,
      type: 'Event',
      url: ev.url,
      status: undefined,
      area: '',
      topics: [],
      flags: [],
      prefs: [],
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
    const dateStr = item.start_date || (item as any).createdAt;
    if (!dateStr) return null;
    const datePart = dateStr.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
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
    return filtered.sort((a: any, b: any) => {
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
    <section className="flex h-full min-h-0 flex-col bg-gray-50 overflow-hidden relative">
      {/* ヘッダー（Weeklyとデザインを統一） */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6 z-20">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 md:text-lg">
            月間カレンダー
          </h1>
          <p className="truncate text-xs text-gray-500">
            {year}年{month + 1}月
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-3">
            {/* タスク表示トグル */}
            <label
              className={`flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${showTasks ? 'text-teal-700' : 'text-gray-400'}`}
            >
              <input
                type="checkbox"
                checked={showTasks}
                onChange={() =>
                  onUpdateSettings({
                    ...appSettings,
                    showTaskInCal: !showTasks,
                  })
                }
                className="sr-only"
              />
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-sm border ${showTasks ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300'}`}
              >
                {showTasks && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
              Tasks
            </label>
            {/* Google表示トグル */}
            <label
              className={`flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${showGcal ? 'text-indigo-700' : 'text-gray-400'}`}
            >
              <input
                type="checkbox"
                checked={showGcal}
                onChange={() =>
                  onUpdateSettings({ ...appSettings, showGcalInCal: !showGcal })
                }
                className="sr-only"
              />
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-sm border ${showGcal ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300'}`}
              >
                {showGcal && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
              Google
            </label>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              今日
            </button>
            <button
              type="button"
              aria-label="前の月"
              onClick={prevMonth}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="次の月"
              onClick={nextMonth}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        {/* =========================================
            上部：カレンダーエリア
            ========================================= */}
        <div className="bg-white border-b border-gray-200 lg:border-b-0 lg:border-r z-10 flex flex-col h-[65%] lg:h-full lg:w-[70%] shrink-0">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 shrink-0">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-1.5 text-center text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド本体（ここで flex-1 と overflow-y-auto を指定してスクロール可能に） */}
        <div className="bg-gray-200 flex-1 overflow-y-auto no-scrollbar">
          {/* 高さを少し縮めて minmax(60px,1fr) に調整 */}
          <div className="grid grid-cols-7 auto-rows-[minmax(60px,1fr)] md:auto-rows-[minmax(90px,1fr)] gap-px">
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
                visibleDiaries.find((diary) => diary.date === dateStr) || null;
              const isEntered = !!(
                dayDiary &&
                dayDiary.content.trim() !== ''
              );

              // スタイリング
              const dayBgColor = isSelected
                ? 'bg-primary-50/50'
                : isCurrentMonth
                  ? 'bg-white'
                  : 'bg-gray-50/50';

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
                  className={`
                    ${dayBgColor} flex flex-col p-1 md:p-1.5 transition-colors cursor-pointer relative
                    ${isSelected ? 'ring-2 ring-inset ring-primary-500 z-10' : ''}
                  `}
                >
                  {/* 日付ラベルと日記ステータス */}
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-xs md:text-sm font-medium ${isToday ? 'text-primary-600 font-bold' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}
                    >
                      {date.getDate()}
                    </span>
                    {/* 日記の✓印 */}
                    {isEntered && (
                      <Check
                        className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px] text-green-500"
                      />
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
                      <div className="text-[9px] text-gray-400 pl-0.5 md:hidden leading-none mt-0.5">
                        他...
                      </div>
                    )}
                    {dayItems.length > 5 && (
                      <div className="text-[10px] text-gray-400 pl-0.5 hidden md:block leading-none mt-0.5">
                        他...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================
          下部：1日の詳細エリア（残り45%の領域を占有）
          ========================================= */}
      <div className="flex-1 min-h-0 min-w-0 p-4 md:p-6 overflow-hidden">
        <div className="max-w-3xl mx-auto h-full min-h-0 flex flex-col">
          {/* 詳細エリア ヘッダー */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-gray-400" />
              {getDateShortString(selectedDateStr)}
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenDairyPhoto(selectedDateStr)}
                aria-label="この日の写真を開く"
                className="flex items-center gap-1.5 p-1.5 md:p-2 rounded-xl text-sm font-bold transition-transform hover:scale-105 shadow-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-400"
              >
                <Aperture className="w-4 h-4" />
              </button>
              {/* 日記入力 / 閲覧ボタン */}
              {diaryMonthLoadError ? (
                <button
                  onClick={() => setDiaryRetryCount((count) => count + 1)}
                  className="text-xs text-red-600"
                >
                  日記を再取得
                </button>
              ) : (
                <button
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
                  className={`flex items-center gap-1.5 p-1.5 md:p-2 rounded-xl text-sm font-bold transition-transform hover:scale-105 shadow-sm bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 ${
                    isSelectedEntered ? ' text-green-600' : ' text-gray-400 '
                  }`}
                >
                  <Notebook className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 1日の予定リスト */}
          {selectedDayItems.length === 0 ? (
            <div className="flex-1 min-h-0 text-center text-gray-400 py-10 text-sm font-medium">
              予定はありません
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <CalendarItem
                scrollRef={setBottomScrollRef}
                entries={selectedDayItems.slice(0, 5).map((item) => {
                  const isGCal = item.source === 'GCAL';
                  const isTask = item.type === 'Task';

                  const itemStyle = isTask
                    ? 'bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100 hover:border-teal-100'
                    : isGCal
                      ? 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 font-medium';

                  return {
                    id: item.id,
                    title: item.title,
                    status: isGCal ? undefined : item.status,
                    className: `${itemStyle} p-3! lg:p-4! lg:rounded-2xl! font-bold text-base!`,
                    item,
                  };
                })}
                onItemClick={(item) => onItemClick(item)}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      {/* FAB */}
      <button
        onClick={() =>
          onOpenCreate({
            type: 'Event',
            start_date: getDateFullString(selectedDate),
          } as LifeItem)
        }
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </section>
  );
}
