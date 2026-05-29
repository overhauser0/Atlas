'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { LifeItem } from '@/types';
import ListItem from './ListItem';
import { groupItemsByYear } from '@/utils/grouping';

export default function ExploreView({
  data,
  onItemClick,
  onOpenConfig,
  onOpenCreate,
}: any) {
  const [activeType, setActiveType] = useState<
    'All' | 'Drinking' | 'Climbing' | 'R-Escape'
  >('All');
  const tabs = ['All', 'Drinking', 'Climbing', 'R-Escape'];

  const filteredData = useMemo(() => {
    if (activeType === 'All') return data;
    // item.topicsの中にactiveTypeが含まれているか判定
    return data.filter((item: LifeItem) => item.topics.includes(activeType));
  }, [data, activeType]);

  const grouped = groupItemsByYear(filteredData);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'PLAN') return -1;
    if (b === 'PLAN') return 1;
    return parseInt(b) - parseInt(a);
  });

  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8 pb-24">
      {/* Exploreタブ用カテゴリフィルタ */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 no-scrollbar mb-4">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
              activeType === t
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {years.map((year) => (
          <div key={year}>
            <h4 className="text-sm font-bold text-gray-800 mb-3 pl-1">
              {year === 'PLAN' ? 'Plan' : year}
            </h4>
            <div className="bg-white border border-black/5 rounded-[20px] shadow-sm flex flex-col divide-y divide-gray-100 overflow-hidden">
              {grouped[year].map((item: LifeItem) => (
                <div key={item.id}>
                  <ListItem item={item} onItemClick={() => onItemClick(item)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onOpenCreate}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
