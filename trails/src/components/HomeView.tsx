'use client';

import { useMemo } from 'react';
import { Archive, Plane, Leaf } from 'lucide-react';
import { LifeItem } from '@/types';
import ListItem from './ListItem';
import JapanMapWidget from './JapanMapWidget';

interface Props {
  onNavigate: (tab: 'Bucket' | 'Travel' | 'Explore') => void;
  onItemClick: (item: LifeItem) => void;
  data: LifeItem[];
}

export default function HomeView({ onNavigate, onItemClick, data }: Props) {
  // 1. 各カテゴリの未完了タスクの数を計算
  const stats = useMemo(() => {
    return {
      bucket: data.filter(
        (i) => i.category?.includes('Bucket') && i.status !== 'Done',
      ).length,
      travel: data.filter(
        (i) => i.category?.includes('Travel') && i.status !== 'Done',
      ).length,
    };
  }, [data]);

  const completedItems = data.filter((item) => item.status === 'Done');

  // 2. data から実際に使われているタグ(fkw)を抽出し、最新の15個を取得
  const recentTags = useMemo(() => {
    const tags = new Set<string>();
    completedItems.forEach((item) => {
      if (item.fkw) item.fkw.forEach((tag) => tags.add(tag));
    });
    const uniqueTags = Array.from(tags).slice(0, 15);
    // タグが全くない場合のフォールバック
    return uniqueTags.length > 0
      ? uniqueTags
      : ['Fukuoka', 'Udon', 'Hiking', 'Winter', 'HotSpring', 'Escape'];
  }, [data]);

  // ListItemに渡すアイコンを判定するヘルパー
  const getIcon = (item: LifeItem) => {
    if (item.category?.includes('Bucket'))
      return <Archive className="w-5 h-5 text-gray-500" />;
    if (item.category?.includes('Travel'))
      return <Plane className="w-5 h-5 text-gray-500" />;
    return <Leaf className="w-5 h-5 text-green-500" />;
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8 pb-24">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* =========================================
            左カラム: 夢と旅のメインナビゲーションカード 
        ========================================= */}
        <div className="space-y-6">
          {/* Bucket Card */}
          <button
            onClick={() => onNavigate('Bucket')}
            className="w-full text-left bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="flex justify-between items-start w-full mb-8">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <Archive className="w-7 h-7" />
              </div>
              <div className="text-5xl font-black text-gray-100 group-hover:text-primary-100 transition-colors">
                {stats.bucket}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Remaining Dreams
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Bucket List</h2>
            </div>
          </button>

          {/* Travel Card */}
          <button
            onClick={() => onNavigate('Travel')}
            className="w-full text-left bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div className="flex justify-between items-start w-full mb-8">
              <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Plane className="w-7 h-7" />
              </div>
              <div className="text-5xl font-black text-gray-100 group-hover:text-sky-100 transition-colors">
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

        {/* =========================================
            右カラム: 旅の残響と最近のアクティビティ 
        ========================================= */}
        <div className="space-y-6">
          {/* Echos of Journey (タグクラウド) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Echos of Journey
            </p>
            <div className="flex flex-wrap gap-2">
              {recentTags.map((tag) => (
                <span key={tag} className="tag-badge text-sm px-3 py-1.5">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <JapanMapWidget data={data} />

          {/* Recent Activity */}
          <section>
            <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3 px-2 mt-4">
              Recent Activity
            </h2>
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col divide-y divide-gray-50 overflow-hidden">
              {completedItems.slice(0, 5).map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  icon={getIcon(item)}
                  onItemClick={() => onItemClick(item)}
                />
              ))}

              {/* アイテムが空の場合の表示 */}
              {data.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm font-medium">
                  No activity yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
