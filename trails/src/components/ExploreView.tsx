'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { LifeItem } from '@/types';
import ListItem from './ListItem';
import { groupItemsByYear } from '@/utils/grouping';

export default function ExploreView({ data, onItemClick, onOpenCreate }: any) {
  const [activeType, setActiveType] = useState<
    'All' | 'Drinking' | 'Climbing' | 'R-Escape'
  >('All');

  // スクロール制御用のref
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabs = ['All', 'Drinking', 'Climbing', 'R-Escape'];

  // カテゴリ切り替え時にスクロールトップ
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeType]);

  const filteredData = useMemo(() => {
    if (activeType === 'All') return data;
    return data.filter((item: LifeItem) => item.topics.includes(activeType));
  }, [data, activeType]);

  const grouped = groupItemsByYear(filteredData);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'PLAN') return -1;
    if (b === 'PLAN') return 1;
    return parseInt(b) - parseInt(a);
  });

  return (
    // 1. 全体高さを固定
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8 relative">
      {/* 2. フィルタタブ部分（縮小させない） */}
      <div className="shrink-0 flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 no-scrollbar mb-2">
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

      {/* 3. リスト部分のみスクロール */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar pb-32"
      >
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h4 className="text-sm font-bold text-gray-800 mb-3 pl-1">
                {year === 'PLAN' ? 'Plan' : year}
              </h4>
              <div className="bg-white border border-black/5 rounded-[20px] shadow-sm flex flex-col divide-y divide-gray-100 overflow-hidden">
                {grouped[year].map((item: LifeItem) => (
                  <div key={item.id}>
                    <ListItem
                      item={item}
                      onItemClick={() => onItemClick(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() =>
          onOpenCreate(activeType === 'All' ? null : { topics: [activeType] })
        }
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
