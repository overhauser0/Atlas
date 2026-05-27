'use client';

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  Key,
  Utensils,
  Mountain,
  Leaf,
  BadgeCheck,
  Archive,
  Plus,
} from 'lucide-react';
import { LifeItem } from '@/types';
import ViewHeader from './ViewHeader';
import { groupItemsByYear } from '@/utils/grouping';

interface Props {
  data: LifeItem[];
  onItemClick: (item: LifeItem) => void;
  onOpenConfig?: () => void;
}

export default function BucketView({ data, onItemClick, onOpenConfig }: Props) {
  const [activeTab, setActiveTab] = useState<'UNDONE' | 'DONE'>('UNDONE');

  const filteredData = useMemo(() => {
    return activeTab === 'UNDONE'
      ? data.filter((i) => i.status !== 'Done')
      : data.filter((i) => i.status === 'Done');
  }, [data, activeTab]);

  const grouped = groupItemsByYear(filteredData);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'PLAN') return -1;
    if (b === 'PLAN') return 1;
    return parseInt(b) - parseInt(a);
  });

  const globalSyncStatus = 'synced'; // ここは将来的に親から渡されるステータスを使用

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'Done')
      return <BadgeCheck className="w-5 h-5 text-green-500" />;
    return <Archive className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8">
      <ViewHeader
        title="Bucket"
        syncStatus={globalSyncStatus} // 親から渡されたステータスを適用
        onOpenConfig={onOpenConfig}
      />

      {/* タブ形式のフィルタリング */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
        {(['UNDONE', 'DONE'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-8 pb-20">
        {years.map((year) => (
          <div key={year}>
            <h4 className="text-sm font-bold text-gray-800 mb-3 pl-1">
              {year === 'PLAN' ? 'Plan' : year}
            </h4>
            <div className="bg-white border border-black/5 rounded-[20px] shadow-sm flex flex-col divide-y divide-gray-100 overflow-hidden">
              {grouped[year].map((item) => (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                >
                  {/* 角丸正方形アイコン */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <StatusIcon status={item.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {item.title}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {item.fkw.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* 日付とChevron */}
                  <div className="flex items-center gap-2">
                    {item.date && (
                      <span className="text-xs text-gray-400 font-medium">
                        {item.date.slice(5, 10).replace('-', '/')}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-transform hover:scale-105 z-30">
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
