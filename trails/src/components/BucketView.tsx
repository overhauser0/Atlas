'use client';

// useRef と useEffect を追加
import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, BadgeCheck, Archive } from 'lucide-react';
import { LifeItem } from '@/types';
import { groupItemsByYear } from '@/utils/grouping';
import ListItem from './ListItem';

interface Props {
  data: LifeItem[];
  onItemClick: (item: LifeItem) => void;
  onOpenCreate?: () => void;
}

export default function BucketView({ data, onItemClick, onOpenCreate }: Props) {
  const [activeTab, setActiveTab] = useState<'UNDONE' | 'DONE'>('UNDONE');

  // スクロールコンテナ用のref
  const scrollRef = useRef<HTMLDivElement>(null);

  // UNDONE / DONE のタブを切り替えた時に一番上に戻す
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

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

  const getIcon = (item: LifeItem) => {
    if (item.status === 'Done') {
      return <BadgeCheck className="w-5 h-5 text-green-500" />;
    } else {
      return <Archive className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    // 1. ラッパーを h-full flex flex-col にして高さを固定
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8 relative">
      {/* 2. タブ部分は shrink-0 で潰れないようにする */}
      <div className="shrink-0 flex bg-gray-200 p-1 rounded-xl mb-6">
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

      {/* 3. リスト部分に flex-1 と overflow-y-auto を付与し、ここでスクロールさせる */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-32"
      >
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
                    icon={getIcon(item)}
                    onItemClick={() => onItemClick(item)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB (配置を少し微調整) */}
      <button
        onClick={onOpenCreate}
        className="absolute bottom-24 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-transform hover:scale-105 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
