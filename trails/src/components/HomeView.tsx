'use client';

import {
  Leaf,
  Settings,
  ChevronRight,
  Archive,
  Plane,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import ViewHeader from './ViewHeader';

interface Props {
  onOpenConfig: () => void;
  // 他のタブへのナビゲーション関数を受け取る
  onNavigate: (tab: 'Bucket' | 'Travel') => void;
  onItemClick: (item: any) => void;
  data: any[];
}

export default function HomeView({ onOpenConfig, onNavigate, data }: Props) {
  // ダミーの同期ステータス (将来的に状態管理フックを繋ぎます)
  const syncStatus = 'synced'; // 'syncing' | 'synced' | 'error'

  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8 pb-24">
      {/* 1. Header (アプリ名 + ステータス + 設定) */}
      <ViewHeader
        title="Trails"
        syncStatus={syncStatus} // 親から渡されたステータスを適用
        onOpenConfig={onOpenConfig}
      />

      {/* 2. Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左: 夢と旅のカード */}
        <div className="space-y-6">
          {/* Bucket Card */}
          <button
            onClick={() => onNavigate('Bucket')}
            className="w-full text-left bento-card p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Remaining Dreams
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Bucket List</h2>
            </div>
            <div className="text-3xl font-bold text-amber-600">12</div>
          </button>

          {/* Travel Card */}
          <button
            onClick={() => onNavigate('Travel')}
            className="w-full text-left bento-card p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Travels
              </p>
              <h2 className="text-2xl font-bold text-gray-900">Journeys</h2>
            </div>
            <div className="text-3xl font-bold text-amber-600">8</div>
          </button>
        </div>

        {/* 右: 旅の残響と最近のアクティビティ */}
        <div className="space-y-6">
          {/* Echos of Journey */}
          <div className="bento-card p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              ECHOS OF JOURNEY
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                '#Fukuoka',
                '#Udon',
                '#Hiking',
                '#Winter',
                '#HotSpring',
                '#Tokyo',
                '#Escape',
                '#BBQ',
                '#Miyajima',
                '#Train',
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <section>
            <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3 px-1">
              Recent Activity
            </h2>
            <div className="bento-card flex flex-col divide-y divide-gray-100">
              {data.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    {item.date ? item.date.slice(5).replace('-', '/') : '-'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
