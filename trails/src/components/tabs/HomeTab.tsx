'use client';

import { useMemo } from 'react';
import { Archive, Plane, Tags } from 'lucide-react';
import { Views, LifeItem } from '@/types';
import ListItem from '../ui/ListItem';
import JapanMapWidget from '../JapanMapWidget';

interface Props {
  onNavigate: (tab: Views) => void;
  onItemClick: (item: LifeItem) => void;
  events: LifeItem[];
  tasks: LifeItem[];
}

export default function HomeTab({
  onNavigate,
  onItemClick,
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
  const recentTasks = useMemo(
    () =>
      tasks
        .filter((item) => item.type === 'Task' && item.status !== 'Done')
        .sort((a, b) => {
          const parsedDateA = a.date ? Date.parse(a.date) : NaN;
          const parsedDateB = b.date ? Date.parse(b.date) : NaN;
          const dateA = Number.isNaN(parsedDateA)
            ? Number.POSITIVE_INFINITY
            : parsedDateA;
          const dateB = Number.isNaN(parsedDateB)
            ? Number.POSITIVE_INFINITY
            : parsedDateB;
          return dateA - dateB;
        })
        .slice(0, 5),
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
            <EchosOfJourney tags={recentTags} />
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
              {completedItems.slice(0, 5).map((item) => (
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

export function EchosOfJourney({ tags }: { tags: string[] }) {
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
          <span key={tag} className="tag-badge text-sm px-3 py-1.5">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
