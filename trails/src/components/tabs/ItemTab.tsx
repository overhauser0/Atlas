'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Beer,
  CalendarDays,
  ChartNoAxesColumn,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LandPlot,
  Lightbulb,
  List,
  Mountain,
  Newspaper,
  Plane,
  Plus,
  Repeat2,
  Wine,
} from 'lucide-react';
import { ItemTabPreset, LifeItem } from '@/types';
import { JA_WEEKDAYS, toDateKey, toLocalDate } from '@/utils/date';
import { groupItemsByYear } from '@/utils/piece';
import ListItem from '@/components/ui/ListItem';
import PageHeader from '@/components/ui/PageHeader';

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
  Liqueur: 'Wine',
};

const PRESET_HEADER_ICONS: Record<ItemTabPreset, React.ReactNode> = {
  Task: <CheckSquare />,
  Bucket: <Archive />,
  Travel: <Plane />,
  Drinking: <Beer />,
  Climbing: <Mountain />,
  'R-Escape': <Lightbulb />,
  Golf: <LandPlot />,
  Article: <Newspaper />,
  Liqueur: <Wine />,
};

export type ItemView = 'List' | 'Cal' | 'Stats';

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
    const map = new Map<string, LifeItem[]>();
    filteredItems.forEach((item) => {
      const date = toLocalDate(item.start_date);
      if (!date) return;
      const key = toDateKey(date);
      const items = map.get(key) ?? [];
      items.push(item);
      map.set(key, items);
    });
    return map;
  }, [filteredItems]);

  const selectedDateItems = itemsByDate.get(toDateKey(selectedDate)) ?? [];

  const stats = useMemo(() => {
    const completed = filteredItems.filter(
      (item) => item.status === 'Done',
    ).length;
    const planned = filteredItems.filter((item) => !item.start_date).length;
    const scheduled = filteredItems.length - planned;
    const completionRate = filteredItems.length
      ? Math.round((completed / filteredItems.length) * 100)
      : 0;
    const byYear = new Map<string, number>();

    filteredItems.forEach((item) => {
      const year = item.start_date?.slice(0, 4) || 'Plan';
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
    } else if (preset === 'Article') {
      onOpenCreate({ type: 'Note', topics: ['Article'] });
    } else if (preset === 'Liqueur') {
      onOpenCreate({ type: 'Note', topics: ['Liqueur'] });
    } else if (preset === 'Bucket') {
      onOpenCreate({ flags: ['Bucket'] });
    } else {
      onOpenCreate({ topics: [preset] });
    }
  };

  return (
    <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
      <PageHeader
        icon={PRESET_HEADER_ICONS[preset]}
        title={preset}
        subtitle={`${filteredItems.length}件の記録`}
        className="mb-4"
        actions={
          preset === 'Bucket' ? (
            <button
              type="button"
              onClick={() =>
                setBucketStatus((status) =>
                  status === 'UNDONE' ? 'DONE' : 'UNDONE',
                )
              }
              aria-label={`Currently showing ${bucketStatus === 'UNDONE' ? 'undone' : 'done'} items. Switch to ${bucketStatus === 'UNDONE' ? 'done' : 'undone'}.`}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  bucketStatus === 'UNDONE' ? 'bg-primary-500' : 'bg-emerald-500'
                }`}
                aria-hidden="true"
              />
              {bucketStatus === 'UNDONE' ? 'Undone' : 'Done'}
              <Repeat2 className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex shrink-0 rounded-xl bg-gray-200/80 p-1">
        {(
          [
            { id: 'List', label: 'List', icon: <List className="h-4 w-4" /> },
            {
              id: 'Cal',
              label: 'Cal',
              icon: <CalendarDays className="h-4 w-4" />,
            },
            {
              id: 'Stats',
              label: 'Stats',
              icon: <ChartNoAxesColumn className="h-4 w-4" />,
            },
          ] as const
        ).map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onViewChange(preset, view.id)}
            aria-pressed={activeView === view.id}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeView === view.id
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-32 no-scrollbar"
      >
        {activeView === 'List' && (
          <div className="space-y-8">
            {years.map((year) => (
              <section key={year}>
                <h2 className="mb-3 pl-1 text-sm font-bold text-gray-800">
                  {year === 'PLAN' ? 'Plan' : year}
                </h2>
                <div className="trails-card flex flex-col divide-y divide-gray-100 overflow-hidden">
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
            <section className="trails-card overflow-hidden">
              <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h2 className="text-base font-bold text-gray-900">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(
                        new Date(today.getFullYear(), today.getMonth(), 1),
                      );
                      setSelectedDate(today);
                    }}
                    className="trails-nav-btn"
                  >
                    今日
                  </button>
                  <button
                    type="button"
                    aria-label="前の月"
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
                    className="trails-nav-icon-btn"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="次の月"
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
                    className="trails-nav-icon-btn"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </header>
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {JA_WEEKDAYS.map((weekday) => (
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
                  const dateKey = toDateKey(date);
                  const dayItems = itemsByDate.get(dateKey) ?? [];
                  const isSelected = dateKey === toDateKey(selectedDate);
                  const isToday = dateKey === toDateKey(new Date());

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
                {JA_WEEKDAYS[selectedDate.getDay()]})
              </h3>
              {selectedDateItems.length ? (
                <div className="trails-card divide-y divide-gray-100 overflow-hidden">
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-2">
                  <StatCard label="Items" value={filteredItems.length} />
                  <StatCard label="Completed" value={stats.completed} />
                  <StatCard label="Scheduled" value={stats.scheduled} />
                  <StatCard label="Planned" value={stats.planned} />
                </div>
                <div className="trails-card p-5">
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
              <section className="trails-card p-5">
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
        className="absolute bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-600"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-white/60 px-4 py-10 text-center text-sm text-gray-400">
      {message}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="trails-card p-5">
      <p className="trails-section-label">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}
