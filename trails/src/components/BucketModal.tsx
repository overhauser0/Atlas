'use client';

import { useState, useMemo } from 'react';
import { LifeItem } from '@/types';
import ViewHeader from './ViewHeader';
import ListItem from './ListItem';
import { groupItemsByYear } from '@/utils/grouping';

interface Props {
  data: LifeItem[];
  onItemClick: (item: LifeItem) => void;
  onOpenConfig?: () => void;
}

export default function BucketView({ data, onItemClick, onOpenConfig }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const filters = ['All', 'Food', 'Event', 'Outdoor', 'Shopping'];

  // チップによるフィルタリング
  const filteredData = useMemo(() => {
    if (activeFilter === 'All') return data;
    return data.filter(
      (item) =>
        item.tags.includes(activeFilter) || item.exploreType === activeFilter,
    );
  }, [data, activeFilter]);

  // UNDONE と DONE に分割
  const undoneItems = filteredData.filter((item) => item.state !== 'Done');
  const doneItems = filteredData.filter((item) => item.state === 'Done');

  // それぞれを年ごとにグループ化
  const undoneGrouped = groupItemsByYear(undoneItems);
  const doneGrouped = groupItemsByYear(doneItems);

  // グループを描画する内部コンポーネント
  const renderGroup = (
    grouped: Record<string, LifeItem[]>,
    opacityClass = '',
  ) => {
    // PLANを先頭にし、年は新しい順に並べる
    const years = Object.keys(grouped).sort((a, b) => {
      if (a === 'PLAN') return -1;
      if (b === 'PLAN') return 1;
      return parseInt(b) - parseInt(a);
    });

    if (years.length === 0)
      return <p className="text-xs text-gray-400 pl-1 mb-6">No items found.</p>;

    return (
      <div className={`space-y-6 ${opacityClass}`}>
        {years.map((year) => (
          <div key={year}>
            <h4 className="text-sm font-bold text-gray-800 mb-3 pl-1">
              {year === 'PLAN' ? 'Plan (No Date)' : year}
            </h4>
            <div className="bg-white border border-black/5 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col divide-y divide-gray-100 overflow-hidden">
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
    );
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8">
      {/* 共通ヘッダー (タイトルは Bucket) */}
      <ViewHeader title="Bucket" onOpenConfig={onOpenConfig} />

      {/* フィルタリングチップ */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 no-scrollbar mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
              activeFilter === f
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* UNDONE セクション */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold tracking-widest text-amber-600 uppercase mb-4 pl-1 border-b border-gray-200 pb-2">
          Undone
        </h3>
        {renderGroup(undoneGrouped)}
      </div>

      {/* DONE セクション */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4 pl-1 border-b border-gray-200 pb-2">
          Done Archive
        </h3>
        {/* Doneの項目は少し透明度を下げて表示 */}
        {renderGroup(
          doneGrouped,
          'opacity-70 hover:opacity-100 transition-opacity',
        )}
      </div>
    </div>
  );
}
