'use client';

import { useMemo } from 'react';
import { Archive, ChevronRight, Plane, Sparkles, Tags } from 'lucide-react';
import { Views, LifeItem } from '@/types';
import ListItem from '../ui/ListItem';
import JapanMapWidget from '../JapanMapWidget';
import { sortByStartDate } from '@/utils/piece';

interface Props {
  onNavigate: (tab: Views) => void;
  onItemClick: (item: LifeItem) => void;
  onTagClick: (tag: string) => void;
  events: LifeItem[];
  tasks: LifeItem[];
}

export default function HomeTab({
  onNavigate,
  onItemClick,
  onTagClick,
  events,
  tasks,
}: Props) {
  const stats = useMemo(() => {
    return {
      bucket: events.filter(
        (i) => i.category?.includes('Bucket') && i.status !== 'Done',
      ).length,
      travel: events.filter(
        (i) => i.category?.includes('Travel') && i.status !== 'Done',
      ).length,
    };
  }, [events]);

  const completedItems = useMemo(
    () => events.filter((item) => item.status === 'Done'),
    [events],
  );
  const recentCompletedItems = useMemo(
    () => sortByStartDate(completedItems, 'desc').slice(0, 5),
    [completedItems],
  );
  const recentTasks = useMemo(
    () =>
      sortByStartDate(
        tasks.filter(
          (item) => item.type === 'Task' && item.status !== 'Done',
        ),
        'asc',
      ).slice(0, 5),
    [tasks],
  );

  const recentTags = useMemo(() => {
    const tags = new Set<string>();
    completedItems.forEach((item) => {
      if (item.fkw) item.fkw.forEach((tag) => tags.add(tag));
    });
    const uniqueTags = Array.from(tags);
    for (let i = uniqueTags.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueTags[i], uniqueTags[j]] = [uniqueTags[j], uniqueTags[i]];
    }
    return uniqueTags.slice(0, 15);
  }, [completedItems]);

  return (
    // 1. 全体高さを固定 (h-full flex flex-col)
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8">
      {/* 2. リスト・グリッド部分のみスクロール */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <button
          type="button"
          onClick={() => onNavigate('Review')}
          className="w-full mb-6 bg-white rounded-3xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between gap-4 hover:shadow-md hover:border-primary-200 transition-all group text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Annual Summary
              </p>
              <h2 className="text-base font-bold text-gray-900 truncate">
                {new Date().getFullYear()} Year in Review
              </h2>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={() => onNavigate('Bucket')}
                className="w-full text-left bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start w-full mb-8">
                  <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                    <Archive className="w-7 h-7" />
                  </div>
                  <div className="text-5xl font-black text-primary-100">
                    {stats.bucket}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Remaining Dreams
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bucket List
                  </h2>
                </div>
              </button>

              <button
                onClick={() => onNavigate('Travel')}
                className="w-full text-left bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start w-full mb-8">
                  <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <Plane className="w-7 h-7" />
                  </div>
                  <div className="text-5xl font-black text-sky-100">
                    {stats.travel}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Next Destinations
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">Journeys</h2>
                </div>
              </button>
            </div>
            <EchosOfJourney tags={recentTags} onTagClick={onTagClick} />
          </div>

          {/* 右カラム */}
          <div className="space-y-6">
            <JapanMapWidget data={events} onItemClick={onItemClick} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6">
          <section>
            <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3 px-2 mt-4">
              Recent Activity
            </h2>
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col divide-y divide-gray-50 overflow-hidden">
              {recentCompletedItems.map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  onItemClick={() => onItemClick(item)}
                  iconClassName="text-green-500"
                />
              ))}
              {events.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm font-medium">
                  No activity yet.
                </div>
              )}
            </div>
          </section>
          <section>
            <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3 px-2 mt-4">
              Recent TASK
            </h2>
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col divide-y divide-gray-50 overflow-hidden">
              {recentTasks.map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  onItemClick={() => onItemClick(item)}
                />
              ))}
              {recentTasks.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm font-medium">
                  No tasks yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function EchosOfJourney({
  tags,
  onTagClick,
}: {
  tags: string[];
  onTagClick: (tag: string) => void;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 w-full mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
            Memories
          </p>
          <h2 className="text-lg font-bold text-gray-900 leading-none">
            Echos of Journey
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className="rounded-xl border border-gray-200/80 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}
