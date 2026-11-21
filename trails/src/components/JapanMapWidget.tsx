'use client';

import { useState, useMemo } from 'react';
import { Map, X } from 'lucide-react';
import { LifeItem } from '@/types';
import { JP_PREFS, normalizePref } from '@/utils/prefecture';
import ListItem from './ui/ListItem';

interface Props {
  data: LifeItem[];
  onItemClick?: (item: LifeItem) => void; // アイテムクリック用に追加
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export default function JapanMapWidget({
  data,
  onItemClick,
  title = 'Footprints',
  subtitle = 'Japan Map',
  headerRight,
}: Props) {
  // モーダルで表示中の県名を管理 (null なら閉じた状態)
  const [selectedPref, setSelectedPref] = useState<string | null>(null);

  // 1. 集計ロジック
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    data.forEach((t: LifeItem) => {
      const prefsArray = t.prefs || [];
      if (Array.isArray(prefsArray)) {
        prefsArray.forEach((prefName: string) => {
          const p = normalizePref(prefName);
          result[p] = (result[p] || 0) + 1;
        });
      }
    });
    return result;
  }, [data]);

  // 2. 選択された県に紐づくアイテムの抽出
  const selectedItems = useMemo(() => {
    if (!selectedPref) return [];
    return data.filter((item) => {
      const prefsArray = item.prefs || [];
      if (!Array.isArray(prefsArray)) return false;
      return prefsArray.some(
        (prefName) => normalizePref(prefName) === selectedPref,
      );
    });
  }, [data, selectedPref]);

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between gap-3 w-full mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                {subtitle}
              </p>
              <h2 className="text-lg font-bold text-gray-900 leading-none">
                {title}
              </h2>
            </div>
          </div>
          {headerRight}
        </div>

        {/* 日本地図グリッド */}
        <div
          className="grid gap-0.5 sm:gap-1 w-full max-w-100"
          style={{
            gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(11, minmax(0, 1fr))',
          }}
        >
          {JP_PREFS.map((pref) => {
            const count = counts[pref.name] || 0;
            const w = pref.w || 1;
            const h = pref.h || 1;

            let bgClass = 'bg-gray-100';
            let textClass = 'text-gray-400';
            if (count >= 11) {
              bgClass = 'bg-sky-800 shadow-sm';
              textClass = 'text-white';
            } else if (count >= 6) {
              bgClass = 'bg-sky-600 shadow-sm';
              textClass = 'text-white';
            } else if (count >= 1) {
              bgClass = 'bg-sky-200';
              textClass = 'text-sky-800';
            }

            return (
              <div
                key={pref.name}
                title={`${pref.name}: ${count}件`}
                onClick={() => {
                  if (count > 0) setSelectedPref(pref.name);
                }}
                className={`
                  ${bgClass} ${textClass} rounded sm:rounded-md flex items-center justify-center 
                  text-[8px] sm:text-[10px] font-bold transition-transform duration-300 
                  ${count > 0 ? 'hover:scale-125 hover:z-10 hover:shadow-md cursor-pointer' : 'cursor-default'}
                  whitespace-nowrap
                `}
                style={{
                  gridColumn: `${pref.x + 1} / span ${w}`,
                  gridRow: `${pref.y + 1} / span ${h}`,
                  aspectRatio: `${w} / ${h}`,
                }}
              >
                {pref.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- 県詳細モーダル --- */}
      {selectedPref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedPref(null)} // 背景クリックで閉じる
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // 中身クリックでは閉じない
          >
            {/* モーダルヘッダー */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-gray-900">
                  {selectedPref}
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">
                  {selectedItems.length}件の記録
                </p>
              </div>
              <button
                onClick={() => setSelectedPref(null)}
                className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* モーダルリストの中身 */}
            <div className="overflow-y-auto no-scrollbar">
              <div className="flex flex-col divide-y divide-gray-50 bg-white border border-gray-50 rounded-2xl">
                {selectedItems.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    onItemClick={() => {
                      if (onItemClick) {
                        onItemClick(item); // 既存の詳細モーダル等を開く
                      }
                      setSelectedPref(null); // クリックしたら地図側のモーダルは閉じる
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
