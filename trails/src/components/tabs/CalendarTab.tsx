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
import { getDateFullString } from '@/utils/dateUtils';
import CalendarItem from '@/components/ui/CalendarItem';

interface CalendarTabProps {
  appSettings: any;
  onUpdateSettings: (newSettings: any) => void;
  data: LifeItem[];
  task: LifeItem[];
  diaries: DiaryItem[];
  googleEvents: GoogleEvent[];
  onItemClick: (item: LifeItem) => void;
  onDiaryClick: (diary: DiaryItem | null) => void;
  onOpenCreate: (item: Partial<LifeItem>) => void;
  onOpenDairyPhoto: (date: string) => void;
}

export default function CalendarTab({
  appSettings,
  onUpdateSettings,
  data,
  task,
  diaries,
  googleEvents,
  onItemClick,
  onDiaryClick,
  onOpenCreate,
  onOpenDairyPhoto,
}: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 新設：選択中の日付（デフォルトは今日）
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const showTasks = !!appSettings?.showTaskInCal;
  const showGcal = !!appSettings?.showGcalInCal;

  // ========== 描画用データの内部結合 ==========
  const calendarItems = useMemo(() => {
    const gcalItems: any[] = (googleEvents || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      note: ev.note,
      date: ev.date,
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

  // カレンダー移動系のハンドラ
  const prevMonth = useCallback(
    () =>
      setCurrentDate(
        (date) => new Date(date.getFullYear(), date.getMonth() - 1, 1),
      ),
    [],
  );
  const nextMonth = useCallback(
    () =>
      setCurrentDate(
        (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1),
      ),
    [],
  );
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

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
    const dateStr = (item as any).date || (item as any).createdAt;
    return dateStr ? new Date(dateStr) : null;
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
    diaries.find(
      (d) => d.name === selectedDateStr || d.date === selectedDateStr,
    ) || null;
  const isSelectedEntered = !!(
    selectedDayDiary &&
    selectedDayDiary.note &&
    selectedDayDiary.note.trim() !== ''
  );

  // 曜日テキスト
  const selectedDayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][
    selectedDate.getDay()
  ];
  const formattedSelectedDate = `${selectedDate.getFullYear()}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getDate()).padStart(2, '0')} (${selectedDayOfWeek})`;

  // ショートカットキー
  useEffect(() => {
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
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50 overflow-hidden">
      {/* =========================================
          上部：カレンダーエリア
          ========================================= */}
      <div className="bg-white border-b border-gray-200 z-10 flex flex-col h-[65%] md:h-full md:w-[70%] shrink-0">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 shrink-0">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-gray-900">
            {year}年 {month + 1}月
          </h2>
          <div className="hidden md:flex items-center gap-3">
            {/* タスク表示トグル */}
            <label
              className={`flex items-center gap-2.5 text-sm font-semibold transition-colors cursor-pointer ${showTasks ? 'text-teal-700' : 'text-gray-400'}`}
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
              className={`flex items-center gap-2.5 text-sm font-semibold transition-colors cursor-pointer ${showGcal ? 'text-indigo-700' : 'text-gray-400'}`}
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
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs md:text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
            <div className="flex space-x-1">
              <button
                onClick={prevMonth}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-t border-gray-100 bg-gray-50/50 shrink-0">
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
                diaries.find((d) => d.name === dateStr || d.date === dateStr) ||
                null;
              const isEntered = !!(
                dayDiary &&
                dayDiary.note &&
                dayDiary.note.trim() !== ''
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
                  onClick={() => setSelectedDate(date)} // セル全体タップで日付選択
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
                    {!!dayDiary && (
                      <Check
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px] ${isEntered ? 'text-green-500' : 'text-gray-200'}`}
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
      <div
        ref={bottomScrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar"
      >
        <div className="max-w-3xl mx-auto">
          {/* 詳細エリア ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-gray-400" />
              {formattedSelectedDate}
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
              {!!selectedDayDiary && (
                <button
                  onClick={() => {
                    if (selectedDayDiary) {
                      onDiaryClick(selectedDayDiary);
                    } else {
                      // 新規作成
                      onDiaryClick({
                        name: selectedDateStr,
                        date: selectedDateStr,
                        note: '',
                      } as DiaryItem);
                    }
                  }}
                  className={`flex items-center gap-1.5 p-1.5 md:p-2 rounded-xl text-sm font-bold transition-transform hover:scale-105 shadow-sm bg-white border border-gray-200 hover:bg-gray-50 ${
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
            <div className="text-center text-gray-400 py-10 text-sm font-medium">
              予定はありません
            </div>
          ) : (
            <div className="flex flex-col gap-2 md:gap-3">
              <CalendarItem
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
                    className: `${itemStyle} p-3! md:p-4! rounded-2xl! font-bold text-sm md:text-base`,
                    item,
                  };
                })}
                onItemClick={(item) => onItemClick(item)}
              />
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => onOpenCreate({ type: 'Event' } as LifeItem)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
