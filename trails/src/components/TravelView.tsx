'use client';

import { Plus } from 'lucide-react';
import { LifeItem } from '@/types';
import ViewHeader from './ViewHeader';
import ListItem from './ListItem';
import { groupItemsByYear } from '@/utils/grouping';

interface Props {
  data: LifeItem[];
  onItemClick: (item: LifeItem) => void;
  onOpenConfig?: () => void;
}

export default function TravelView({ data, onItemClick, onOpenConfig }: Props) {
  const grouped = groupItemsByYear(data);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'PLAN') return -1;
    if (b === 'PLAN') return 1;
    return parseInt(b) - parseInt(a);
  });

  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8 pb-24">
      <ViewHeader title="Travel" onOpenConfig={onOpenConfig} />

      <div className="space-y-8">
        {years.map((year) => (
          <div key={year}>
            <h4 className="text-sm font-bold text-gray-800 mb-3 pl-1">
              {year === 'PLAN' ? 'Plan' : year}
            </h4>
            <div className="bg-white border border-black/5 rounded-[20px] shadow-sm flex flex-col divide-y divide-gray-100 overflow-hidden">
              {grouped[year].map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-transform hover:scale-105 z-30">
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
