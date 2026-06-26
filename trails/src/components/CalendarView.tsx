// src/components/CalendarView.tsx

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LifeItem } from '@/types';
import { DiaryItem } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';

interface CalendarViewProps {
  data: LifeItem[];
  diaries: DiaryItem[];
  googleEvents: GoogleEvent[];
  onItemClick: (item: LifeItem) => void;
  onDiaryClick: (diary: DiaryItem | null) => void;
}

export default function CalendarView({
  data,
  diaries,
  googleEvents,
  onItemClick,
  onDiaryClick,
}: CalendarViewProps) {
  // ========== 描画用データの内部結合 ==========

  const calendarItems = useMemo(() => {
    // Google Event を LifeItem の型に合わせる
    const gcalItems: any[] = (googleEvents || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      note: ev.note,
      date: ev.date,
      type: 'GoogleCalendar', // UI分岐用のマーカー
      url: ev.url,
      // LifeItem型の必須要件を満たすダミー値
      status: 'Done',
      area: '',
      topics: [],
      flags: [],
      prefs: [],
      category: [],
    }));

    return [...data, ...gcalItems];
  }, [data, googleEvents]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentDate]);

  // 月の移動ハンドラ
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // カレンダーグリッドの計算（常に6週間=42マスを表示）
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0:Sun ~ 6:Sat
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // 1. 前月のはみ出し分
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // 2. 当月分
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // 3. 次月のはみ出し分（合計42マスになるように埋める）
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // アイテムから日付を取得するヘルパー（※実際のプロパティ名に書き換えてください）
  const getItemDate = (item: LifeItem): Date | null => {
    // 例: item.date や item.createdAt が存在する場合
    const dateStr = (item as any).date || (item as any).createdAt;
    return dateStr ? new Date(dateStr) : null;
  };

  // 特定の日のアイテムを取得
  const getItemsForDate = (date: Date) => {
    return calendarItems.filter((item) => {
      const itemDate = getItemDate(item);
      if (!itemDate) return false;
      return (
        itemDate.getFullYear() === date.getFullYear() &&
        itemDate.getMonth() === date.getMonth() &&
        itemDate.getDate() === date.getDate()
      );
    });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  // YYYY-MM-DDを生成するヘルパー
  const getFormatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          {year}年 {month + 1}月
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
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
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド本体 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar bg-gray-200"
      >
        <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] gap-px">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const isToday =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();

            const dayItems = getItemsForDate(date);

            // ========== 日記の入力判定 ==========
            const dateStr = getFormatDateStr(date);
            const dayDiary =
              diaries.find((d) => d.name === dateStr || d.date === dateStr) ||
              null;

            // noteが存在し、かつ空文字ではない場合を「入力済」とする
            const isEntered = !!(
              dayDiary &&
              dayDiary.note &&
              dayDiary.note.trim() !== ''
            );

            // ========== スタイリング ==========
            const dayBgColor = isToday
              ? 'bg-primary-50/80'
              : isCurrentMonth
                ? 'bg-white'
                : 'bg-gray-50/50';

            const enteredDot = `w-1 h-1 md:w-2 md:h-2 rounded-full transition-all ${isEntered ? 'bg-green-500' : 'bg-gray-300'}`;

            return (
              <div
                key={idx}
                className={`${dayBgColor} flex flex-col p-0.5 md:p-1.5 transition-colors`}
              >
                {/* 日付ラベル */}
                <button
                  className="flex justify-between items-center mb-1"
                  onClick={() => {
                    if (dayDiary) {
                      onDiaryClick(dayDiary);
                    }
                  }}
                  disabled={!dayDiary}
                >
                  <span className="text-gray-700 text-sm">
                    {date.getDate()}
                  </span>
                  {dayDiary && <span className={enteredDot}></span>}
                </button>

                {/* 予定リスト */}
                <div className="flex flex-col gap-0.5 md:gap-1 overflow-y-auto no-scrollbar flex-1">
                  {dayItems.map((item) => {
                    const isGCal = item.type === 'GoogleCalendar';

                    return (
                      <div
                        key={item.id}
                        onClick={() => onItemClick(item)} // 内部のハンドラを呼ぶ
                        className={`cursor-pointer text-[10px] px-1 py-0.5 md:py-1 overflow-hidden whitespace-nowrap transition-all ${
                          isGCal
                            ? 'bg-gray-50 text-gray-700 border-l-2 border-l-blue-400 border-y border-r border-gray-200 rounded-sm hover:bg-gray-100'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-sm hover:bg-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {item.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
