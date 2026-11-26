'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { LifeItem } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import { addDays, toDateKey, toLocalDate } from '@atlas/shared/date';
import PageHeader from '@/components/ui/PageHeader';

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
      entry.startDate === day ? (timeToMinutes(entry.startTime) ?? 0) : 0;
    const endMinute =
      entry.endDate === day
        ? (timeToMinutes(entry.endTime) ?? 1440)
        : entry.endDate
          ? 1440
          : Math.min(startMinute + 60, 1440);

    if (endMinute <= startMinute) return [];
    return [{ ...entry, startMinute, endMinute, lane: 0, laneCount: 1 }];
  });

  const laneEnds: number[] = [];
  dayEntries
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute)
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
          key: toDateKey(date),
        };
      }),
    [weekStart],
  );
  const todayKey = toDateKey(new Date());

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
        const parsedEndDate =
          entry.isGoogleEvent && entry.endDate
            ? toLocalDate(entry.endDate)
            : null;
        const finalDate = parsedEndDate
          ? toDateKey(addDays(parsedEndDate, -1))
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
      new Map(days.map(({ key }) => [key, buildTimedEntries(entries, key)])),
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
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-3 pt-3 pb-3 md:px-8 md:pt-8 md:pb-6">
      <PageHeader
        icon={<CalendarDays />}
        title={
          <>
            Weekly<span className="hidden sm:inline"> Calendar</span>
          </>
        }
        subtitle={weekLabel}
        nowrap
        className="mb-2.5 md:mb-4"
        actions={
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWeekStart(getSunday(new Date()))}
              className="trails-nav-btn"
            >
              今日
            </button>
            <button
              type="button"
              aria-label="前の週"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
              className="trails-nav-icon-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="次の週"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
              className="trails-nav-icon-btn"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <section className="trails-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto trails-scrollbar">
          <div style={{ minWidth: contentWidth }}>
            <div className="sticky top-0 z-30">
              <div
                className="grid border-b border-gray-100 bg-white"
                style={{
                  gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(${DAY_WIDTH}px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-40 border-r border-gray-100 bg-white" />
                {days.map(({ weekday, date, key }, index) => (
                  <div
                    key={key}
                    className={`border-r border-gray-100 px-2 py-2.5 text-center last:border-r-0 ${
                      key === todayKey ? 'bg-primary-50/60' : ''
                    }`}
                  >
                    <div
                      className={`text-[11px] font-semibold ${
                        index === 0
                          ? 'text-rose-400'
                          : index === 6
                            ? 'text-sky-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {weekday}
                    </div>
                    <div
                      className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        key === todayKey
                          ? 'bg-primary-500 text-white'
                          : index === 0
                            ? 'text-rose-500'
                            : index === 6
                              ? 'text-sky-600'
                              : 'text-gray-800'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="grid border-b border-gray-100 bg-gray-50/95"
                style={{
                  gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(${DAY_WIDTH}px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-40 flex items-start justify-end border-r border-gray-100 bg-gray-50 px-1.5 pt-2 text-[10px] font-bold uppercase text-gray-400">
                  終日
                </div>
                {days.map(({ key }) => (
                  <div
                    key={key}
                    className={`border-r border-gray-100 p-1.5 last:border-r-0 ${
                      key === todayKey ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      {(allDayByDate.get(key) || []).map((entry, index) => (
                        <button
                          key={`${entry.item.source}-${entry.item.id}-${index}`}
                          type="button"
                          onClick={() => onItemClick(entry.item)}
                          title={entry.item.title}
                          className={`flex flex-col items-start justify-start truncate rounded-lg border px-2 py-1 text-left text-[10px] font-semibold transition-colors ${
                            entry.isGoogleEvent
                              ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                              : entry.item.type === 'Task'
                                ? 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100'
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
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(${DAY_WIDTH}px, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-20 border-r border-gray-100 bg-white">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="relative border-t border-gray-100 pr-1.5 text-right font-mono text-[10px] text-gray-400"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <span className="relative -top-2">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {days.map(({ key }) => (
                <div
                  key={key}
                  className={`relative border-r border-gray-100 last:border-r-0 ${
                    key === todayKey ? 'bg-primary-50/20' : 'bg-white'
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
                      ((entry.endMinute - entry.startMinute) / 60) *
                        HOUR_HEIGHT,
                    );
                    const startText =
                      entry.startDate === key
                        ? formatTime(entry.startTime)
                        : '00:00';
                    const endText =
                      entry.endDate === key
                        ? formatTime(entry.endTime)
                        : '24:00';
                    return (
                      <button
                        key={`${entry.item.source}-${entry.item.id}`}
                        type="button"
                        onClick={() => onItemClick(entry.item)}
                        title={`${startText} - ${endText} ${entry.item.title}`}
                        className={`absolute z-10 flex flex-col items-start justify-start overflow-hidden rounded-lg border px-2 py-1 text-left shadow-xs transition-colors ${
                          entry.isGoogleEvent
                            ? 'border-gray-200 bg-gray-50/95 text-gray-700 hover:bg-gray-100'
                            : entry.item.type === 'Task'
                              ? 'border-teal-100 bg-teal-50/95 text-teal-700 hover:bg-teal-100'
                              : 'border-indigo-100 bg-indigo-50/95 text-indigo-700 hover:bg-indigo-100'
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
    </div>
  );
}
