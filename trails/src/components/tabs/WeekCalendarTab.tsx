'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LifeItem } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';

interface Props {
  events: LifeItem[];
  tasks: LifeItem[];
  googleEvents: GoogleEvent[];
  showTasks: boolean;
  showGoogleEvents: boolean;
  onItemClick: (item: LifeItem) => void;
}

interface CalendarEntry {
  item: LifeItem;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  isAllDay: boolean;
  isGoogleEvent: boolean;
}

interface TimedEntry extends CalendarEntry {
  startMinute: number;
  endMinute: number;
  lane: number;
  laneCount: number;
}

const HOUR_HEIGHT = 64;
const DAY_WIDTH = 132;
const TIME_COLUMN_WIDTH = 52;

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDateKey = (key: string) => {
  const [year, month, day] = key.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, count: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
};

const getSunday = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const timeToMinutes = (time: string | null | undefined) => {
  if (!time) return null;
  const match = time.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const formatTime = (time: string | null) => {
  const minutes = timeToMinutes(time);
  if (minutes === null) return '';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

const getWeekdayLabel = (date: Date) =>
  new Intl.DateTimeFormat('ja-JP', {
    weekday: 'short',
  }).format(date);

const buildTimedEntries = (
  entries: CalendarEntry[],
  day: string,
): TimedEntry[] => {
  const dayEntries = entries.flatMap((entry) => {
    if (entry.isAllDay || entry.startDate > day) return [];
    const finalDate = entry.endDate || entry.startDate;
    if (finalDate < day) return [];

    const startMinute =
      entry.startDate === day ? timeToMinutes(entry.startTime) ?? 0 : 0;
    const endMinute =
      entry.endDate === day
        ? timeToMinutes(entry.endTime) ?? 1440
        : entry.endDate
          ? 1440
          : Math.min(startMinute + 60, 1440);

    if (endMinute <= startMinute) return [];
    return [{ ...entry, startMinute, endMinute, lane: 0, laneCount: 1 }];
  });

  const laneEnds: number[] = [];
  dayEntries
    .sort(
      (a, b) =>
        a.startMinute - b.startMinute || a.endMinute - b.endMinute,
    )
    .forEach((entry) => {
      let lane = laneEnds.findIndex((end) => end <= entry.startMinute);
      if (lane === -1) lane = laneEnds.length;
      entry.lane = lane;
      laneEnds[lane] = entry.endMinute;
    });

  return dayEntries.map((entry) => ({
    ...entry,
    laneCount: laneEnds.length || 1,
  }));
};

export default function WeekCalendarTab({
  events,
  tasks,
  googleEvents,
  showTasks,
  showGoogleEvents,
  onItemClick,
}: Props) {
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()));

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
          weekday: getWeekdayLabel(date),
          date,
          key: dateKey(date),
        };
      }),
    [weekStart],
  );
  const todayKey = dateKey(new Date());

  const entries = useMemo(() => {
    const calendarItems: CalendarEntry[] = [
      ...events,
      ...(showTasks ? tasks : []),
    ].map((item) => ({
      item,
      startDate: item.start_date?.slice(0, 10) || '',
      startTime: item.start_time || null,
      endDate: item.end_date?.slice(0, 10) || null,
      endTime: item.end_time || null,
      isAllDay: !item.start_time,
      isGoogleEvent: false,
    }));

    if (showGoogleEvents) {
      googleEvents.forEach((event) => {
        const item: LifeItem = {
          id: event.id,
          title: event.title,
          status: '',
          start_date: event.start_date,
          start_time: event.start_time,
          end_date: event.end_date,
          end_time: event.end_time,
          area: null,
          type: 'Event',
          topics: [],
          flags: [],
          note: event.note || '',
          url: event.url || '',
          fkw: [],
          prefs: [],
          imageUrl: '',
          iconType: 'Calendar',
          source: 'GCAL',
        };
        calendarItems.push({
          item,
          startDate: event.start_date.slice(0, 10),
          startTime: event.start_time,
          endDate: event.end_date?.slice(0, 10) || null,
          endTime: event.end_time,
          isAllDay: !event.start_time,
          isGoogleEvent: true,
        });
      });
    }

    return calendarItems.filter((entry) => entry.startDate);
  }, [events, tasks, googleEvents, showTasks, showGoogleEvents]);

  const allDayByDate = useMemo(() => {
    const byDate = new Map<string, CalendarEntry[]>();
    entries
      .filter((entry) => entry.isAllDay)
      .forEach((entry) => {
        const finalDate =
          entry.isGoogleEvent && entry.endDate
            ? dateKey(addDays(parseDateKey(entry.endDate), -1))
            : entry.endDate || entry.startDate;
        days.forEach(({ key }) => {
          if (key >= entry.startDate && key <= finalDate) {
            const dayEntries = byDate.get(key) || [];
            dayEntries.push(entry);
            byDate.set(key, dayEntries);
          }
        });
      });
    return byDate;
  }, [entries, days]);

  const timedByDate = useMemo(
    () =>
      new Map(
        days.map(({ key }) => [key, buildTimedEntries(entries, key)]),
      ),
    [entries, days],
  );

  const weekLabel = `${new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(weekStart)} - ${new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
  }).format(addDays(weekStart, 6))}`;

  const contentWidth = TIME_COLUMN_WIDTH + DAY_WIDTH * 7;

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 md:text-lg">
            週間カレンダー
          </h1>
          <p className="truncate text-xs text-gray-500">{weekLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(getSunday(new Date()))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            今日
          </button>
          <button
            type="button"
            aria-label="前の週"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="次の週"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto trails-scrollbar">
        <div style={{ minWidth: contentWidth }}>
          <div
            className="sticky top-0 z-30 grid border-b border-gray-200 bg-white shadow-sm"
            style={{
              gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(${DAY_WIDTH}px, 1fr))`,
            }}
          >
            <div className="border-r border-gray-100" />
            {days.map(({ weekday, date, key }) => (
              <div
                key={key}
                className={`border-r border-gray-100 px-2 py-2 text-center last:border-r-0 ${
                  key === todayKey ? 'bg-amber-50' : ''
                }`}
              >
                <div className="text-[11px] font-medium text-gray-500">
                  {weekday}
                </div>
                <div
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    key === todayKey
                      ? 'bg-amber-500 text-white'
                      : 'text-gray-800'
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div
            className="sticky top-[58px] z-20 grid border-b border-gray-200 bg-gray-50"
            style={{
              gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(${DAY_WIDTH}px, 1fr))`,
            }}
          >
            <div className="flex items-start justify-end border-r border-gray-200 px-1 pt-2 text-[10px] font-semibold uppercase text-gray-400">
              終日
            </div>
            {days.map(({ key }) => (
              <div
                key={key}
                className={`min-h-11 border-r border-gray-200 p-1 last:border-r-0 ${
                  key === todayKey ? 'bg-amber-50/50' : ''
                }`}
              >
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                  {(allDayByDate.get(key) || []).map((entry, index) => (
                    <button
                      key={`${entry.item.source}-${entry.item.id}-${index}`}
                      type="button"
                      onClick={() => onItemClick(entry.item)}
                      title={entry.item.title}
                      className={`flex flex-col items-start justify-start truncate rounded border px-1.5 py-1 text-left text-[10px] font-medium ${
                        entry.isGoogleEvent
                          ? 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                          : entry.item.type === 'Task'
                            ? 'border-teal-100 bg-teal-50 text-teal-700 hover:border-teal-100 hover:bg-teal-100'
                            : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {entry.item.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(${DAY_WIDTH}px, 1fr))`,
            }}
          >
            <div className="relative border-r border-gray-200 bg-white">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="relative border-t border-gray-100 pr-1 text-right text-[10px] text-gray-400"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="-top-2 relative">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map(({ key }) => (
              <div
                key={key}
                className={`relative border-r border-gray-100 last:border-r-0 ${
                  key === todayKey ? 'bg-amber-50/20' : 'bg-white'
                }`}
                style={{
                  height: HOUR_HEIGHT * 24,
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, transparent 0, transparent 63px, #f3f4f6 63px, #f3f4f6 64px)',
                }}
              >
                {(timedByDate.get(key) || []).map((entry) => {
                  const top = (entry.startMinute / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    22,
                    ((entry.endMinute - entry.startMinute) / 60) * HOUR_HEIGHT,
                  );
                  const startText =
                    entry.startDate === key ? formatTime(entry.startTime) : '00:00';
                  const endText =
                    entry.endDate === key ? formatTime(entry.endTime) : '24:00';
                  return (
                    <button
                      key={`${entry.item.source}-${entry.item.id}`}
                      type="button"
                      onClick={() => onItemClick(entry.item)}
                      title={`${startText} - ${endText} ${entry.item.title}`}
                      className={`absolute z-10 flex flex-col items-start justify-start overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm ${
                        entry.isGoogleEvent
                          ? 'border-gray-200 bg-gray-50/95 text-gray-700'
                          : entry.item.type === 'Task'
                            ? 'border-teal-100 bg-teal-50/95 text-teal-700'
                            : 'border-indigo-100 bg-indigo-50/95 text-indigo-700'
                      }`}
                      style={{
                        top,
                        height,
                        left: `calc(${(entry.lane / entry.laneCount) * 100}% + 2px)`,
                        width: `calc(${100 / entry.laneCount}% - 4px)`,
                      }}
                    >
                      <span className="block truncate text-[10px] font-bold">
                        {startText} {entry.item.title}
                      </span>
                      {height >= 42 && (
                        <span className="block truncate text-[9px] opacity-70">
                          {endText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
