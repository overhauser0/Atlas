'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Repeat2,
  List,
  Plus,
  Newspaper,
} from 'lucide-react';
import { ItemTabPreset, LifeItem } from '@/types';
import { groupItemsByYear } from '@/utils/grouping';
import ListItem from '@/components/ui/ListItem';

interface Props {
  preset: ItemTabPreset;
  data: LifeItem[];
  activeView: ItemView;
  onViewChange: (preset: ItemTabPreset, view: ItemView) => void;
  onItemClick: (item: LifeItem) => void;
  onOpenCreate: (item?: Partial<LifeItem> | null) => void;
}

const ITEM_ICONS: Partial<Record<ItemTabPreset, string>> = {
  Task: 'CheckSquare',
  Drinking: 'Beer',
  Climbing: 'Mountain',
  'R-Escape': 'Lightbulb',
  Golf: 'LandPlot',
  Article: 'Newspaper',
};

export type ItemView = 'List' | 'Cal' | 'Stats';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const toLocalDate = (date: string | null): Date | null => {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function ItemTab({
  preset,
  data,
  activeView,
  onViewChange,
  onItemClick,
  onOpenCreate,
}: Props) {
  const [bucketStatus, setBucketStatus] = useState<'UNDONE' | 'DONE'>('UNDONE');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeView, bucketStatus, preset]);

  const filteredItems = useMemo(() => {
    if (preset === 'Task') {
      return data.filter((item) => item.type === 'Task');
    }

    if (preset === 'Bucket') {
      return data
        .filter((item) => item.category?.includes('Bucket'))
        .filter((item) =>
          bucketStatus === 'DONE'
            ? item.status === 'Done'
            : item.status !== 'Done',
        );
    }

    return data.filter((item) =>
      preset === 'Travel'
        ? item.topics?.includes('Travel')
        : item.topics?.includes(preset),
    );
  }, [data, preset, bucketStatus]);

  const grouped = useMemo(
    () => groupItemsByYear(filteredItems),
    [filteredItems],
  );
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'PLAN') return -1;
    if (b === 'PLAN') return 1;
    return parseInt(b, 10) - parseInt(a, 10);
  });

  const iconForItem = (item: LifeItem) => {
    if (preset === 'Task') return ITEM_ICONS.Task;
    if (preset === 'Bucket') {
      return item.status === 'Done' ? 'BadgeCheck' : 'Archive';
    }
    return ITEM_ICONS[preset] ?? 'Plane';
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    return Array.from({ length: cellCount }, (_, index) => {
      const date = new Date(year, month, index - firstWeekday + 1);
      return { date, isCurrentMonth: date.getMonth() === month };
    });
  }, [currentMonth]);

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, LifeItem[]>();
    filteredItems.forEach((item) => {
      const date = toLocalDate(item.date);
      if (!date) return;
      const key = getDateKey(date);
      const items = grouped.get(key) ?? [];
      items.push(item);
      grouped.set(key, items);
    });
    return grouped;
  }, [filteredItems]);

  const selectedDateItems = itemsByDate.get(getDateKey(selectedDate)) ?? [];

  const stats = useMemo(() => {
    const completed = filteredItems.filter(
      (item) => item.status === 'Done',
    ).length;
    const planned = filteredItems.filter((item) => !item.date).length;
    const scheduled = filteredItems.length - planned;
    const completionRate = filteredItems.length
      ? Math.round((completed / filteredItems.length) * 100)
      : 0;
    const byYear = new Map<string, number>();

    filteredItems.forEach((item) => {
      const year = item.date?.slice(0, 4) || 'Plan';
      byYear.set(year, (byYear.get(year) ?? 0) + 1);
    });

    const byYearEntries = [...byYear.entries()].sort(([a], [b]) => {
      if (a === 'Plan') return -1;
      if (b === 'Plan') return 1;
      return Number(b) - Number(a);
    });

    return {
      completed,
      planned,
      scheduled,
      completionRate,
      byYear: byYearEntries,
      maxYearCount: Math.max(0, ...byYearEntries.map(([, count]) => count)),
    };
  }, [filteredItems]);

  const handleCreate = () => {
    if (preset === 'Task') {
      onOpenCreate({ type: 'Task' });
    } else if (preset === 'Bucket') {
      onOpenCreate({ flags: ['Bucket'] });
    } else {
      onOpenCreate({ topics: [preset] });
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8 relative">
      <div className="shrink-0 flex bg-gray-200 p-1 rounded-xl mb-4">
        {(
          [
            { id: 'List', label: 'List', icon: <List className="w-4 h-4" /> },
            {
              id: 'Cal',
              label: 'Cal',
              icon: <CalendarDays className="w-4 h-4" />,
            },
            {
              id: 'Stats',
              label: 'Stats',
              icon: <ChartNoAxesColumn className="w-4 h-4" />,
            },
          ] as const
        ).map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onViewChange(preset, view.id)}
            aria-pressed={activeView === view.id}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeView === view.id
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      {preset === 'Bucket' && (
        <div className="mb-4 flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              setBucketStatus((status) =>
                status === 'UNDONE' ? 'DONE' : 'UNDONE',
              )
            }
            aria-label={`Currently showing ${bucketStatus === 'UNDONE' ? 'undone' : 'done'} items. Switch to ${bucketStatus === 'UNDONE' ? 'done' : 'undone'}.`}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                bucketStatus === 'UNDONE' ? 'bg-amber-500' : 'bg-green-500'
              }`}
              aria-hidden="true"
            />
            {bucketStatus === 'UNDONE' ? 'Undone' : 'Done'}
            <Repeat2 className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar pb-32"
      >
        {activeView === 'List' && (
          <div className="space-y-8">
            {years.map((year) => (
              <section key={year}>
                <h2 className="text-sm font-bold text-gray-800 mb-3 pl-1">
                  {year === 'PLAN' ? 'Plan' : year}
                </h2>
                <div className="bg-white border border-black/5 rounded-[20px] shadow-sm flex flex-col divide-y divide-gray-100 overflow-hidden">
                  {grouped[year].map((item) => (
                    <ListItem
                      key={item.id}
                      item={item}
                      icon={iconForItem(item)}
                      onItemClick={() => onItemClick(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {filteredItems.length === 0 && (
              <EmptyState message="No items to show." />
            )}
          </div>
        )}

        {activeView === 'Cal' && (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <header className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-bold text-gray-900">
                  {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(
                        new Date(today.getFullYear(), today.getMonth(), 1),
                      );
                      setSelectedDate(today);
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCurrentMonth(
                        (month) =>
                          new Date(
                            month.getFullYear(),
                            month.getMonth() - 1,
                            1,
                          ),
                      )
                    }
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCurrentMonth(
                        (month) =>
                          new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            1,
                          ),
                      )
                    }
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </header>
              <div className="grid grid-cols-7 border-t border-gray-100 bg-gray-50">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="py-2 text-center text-[10px] font-semibold text-gray-400 sm:text-xs"
                  >
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-100">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const dateKey = getDateKey(date);
                  const dayItems = itemsByDate.get(dateKey) ?? [];
                  const isSelected = dateKey === getDateKey(selectedDate);
                  const isToday = dateKey === getDateKey(new Date());

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        if (!isCurrentMonth) {
                          setCurrentMonth(
                            new Date(date.getFullYear(), date.getMonth(), 1),
                          );
                        }
                      }}
                      aria-pressed={isSelected}
                      className={`relative min-h-16 p-1 pt-2 text-left transition-colors sm:min-h-24 sm:p-1.5 ${
                        isSelected
                          ? 'bg-primary-50 ring-2 ring-inset ring-primary-500'
                          : 'bg-white hover:bg-gray-50'
                      } ${isCurrentMonth ? '' : 'text-gray-300'}`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? 'bg-primary-500 font-bold text-white'
                            : isCurrentMonth
                              ? 'text-gray-700'
                              : 'text-gray-300'
                        } absolute left-1 top-1 sm:left-1.5 sm:top-1.5`}
                      >
                        {date.getDate()}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="mt-1 block truncate text-[9px] font-medium text-primary-700 sm:hidden">
                          {dayItems.length}件
                        </span>
                      )}
                      <span className="mt-1 hidden space-y-0.5 sm:block">
                        {dayItems.slice(0, 2).map((item) => (
                          <span
                            key={item.id}
                            className="block truncate rounded bg-primary-50 px-1 py-0.5 text-[10px] text-primary-700"
                          >
                            {item.title}
                          </span>
                        ))}
                        {dayItems.length > 2 && (
                          <span className="block px-1 text-[9px] text-gray-400">
                            +{dayItems.length - 2}件
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 px-1 text-sm font-bold text-gray-800">
                {selectedDate.getFullYear()}/
                {String(selectedDate.getMonth() + 1).padStart(2, '0')}/
                {String(selectedDate.getDate()).padStart(2, '0')} (
                {WEEKDAYS[selectedDate.getDay()]})
              </h3>
              {selectedDateItems.length ? (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  {selectedDateItems.map((item) => (
                    <ListItem
                      key={item.id}
                      item={item}
                      icon={iconForItem(item)}
                      onItemClick={() => onItemClick(item)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState message="No items on this date." />
              )}
            </section>
          </div>
        )}

        {activeView === 'Stats' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <section className="space-y-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
                  <StatCard label="Items" value={filteredItems.length} />
                  <StatCard label="Completed" value={stats.completed} />
                  <StatCard label="Scheduled" value={stats.scheduled} />
                  <StatCard label="Planned" value={stats.planned} />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">
                      Completion
                    </h2>
                    <span className="text-sm font-bold text-primary-700">
                      {stats.completionRate}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-gray-100"
                    role="progressbar"
                    aria-label="Completion rate"
                    aria-valuenow={stats.completionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-gray-900">
                  By Year
                </h2>
                {stats.byYear.length ? (
                  <div className="space-y-3">
                    {stats.byYear.map(([year, count]) => (
                      <div key={year} className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-xs font-medium text-gray-500">
                          {year}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-primary-400"
                            style={{
                              width: `${(count / stats.maxYearCount) * 90}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-gray-700">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No items to summarize.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleCreate}
        aria-label="Create item"
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
      {message}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
