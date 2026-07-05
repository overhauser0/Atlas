'use client';

import { Plus, Plane } from 'lucide-react';
import { LifeItem } from '@/types';
import ListItem from './ListItem';
import { groupItemsByYear } from '@/utils/grouping';

interface Props {
  data: LifeItem[];
  onItemClick: (item: LifeItem) => void;
  onOpenCreate: (item?: Partial<LifeItem>) => void;
}

export default function TravelView({ data, onItemClick, onOpenCreate }: Props) {
  const grouped = groupItemsByYear(data);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'PLAN') return -1;
    if (b === 'PLAN') return 1;
    return parseInt(b) - parseInt(a);
  });

  return (
    // 1. h-full, flex, flex-col で高さを親のmainいっぱいに固定
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8 relative">
      {/* 2. flex-1, overflow-y-auto でここだけがスクロールする */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h4 className="text-sm font-bold text-gray-800 mb-3 pl-1">
                {year === 'PLAN' ? 'Plan' : year}
              </h4>
              <div className="bg-white border border-black/5 rounded-[20px] shadow-sm flex flex-col divide-y divide-gray-100 overflow-hidden">
                {grouped[year].map((item) => (
                  <div key={item.id}>
                    <ListItem
                      item={item}
                      icon={<Plane className="w-5 h-5 text-gray-500" />}
                      onItemClick={() => onItemClick(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. FABは固定配置 (absolute) */}
      <button
        onClick={() => onOpenCreate({ topics: ['Travel'] })}
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
