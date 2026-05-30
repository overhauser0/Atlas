'use client';

import { useMemo } from 'react';
import { Map } from 'lucide-react';
import { LifeItem } from '@/types';

interface Props {
  data: LifeItem[];
}

// 座標データ
const JP_PREFS = [
  { name: '北海道', x: 10, y: 0, w: 2, h: 2 },
  { name: '青森', x: 10, y: 2, w: 2 },
  { name: '秋田', x: 10, y: 3 },
  { name: '岩手', x: 11, y: 3 },
  { name: '山形', x: 10, y: 4 },
  { name: '宮城', x: 11, y: 4 },
  { name: '福島', x: 11, y: 5 },
  { name: '茨城', x: 11, y: 6 },
  { name: '栃木', x: 10, y: 6 },
  { name: '群馬', x: 9, y: 6 },
  { name: '埼玉', x: 10, y: 7 },
  { name: '千葉', x: 11, y: 7, h: 2 },
  { name: '東京', x: 10, y: 8 },
  { name: '神奈川', x: 10, y: 9 },
  { name: '新潟', x: 9, y: 5, w: 2, h: 1 },
  { name: '富山', x: 8, y: 5 },
  { name: '石川', x: 7, y: 4 },
  { name: '福井', x: 7, y: 5 },
  { name: '山梨', x: 9, y: 7 },
  { name: '長野', x: 8, y: 6 },
  { name: '岐阜', x: 8, y: 7 },
  { name: '静岡', x: 9, y: 8 },
  { name: '愛知', x: 8, y: 8 },
  { name: '三重', x: 7, y: 8 },
  { name: '滋賀', x: 7, y: 6, h: 2 },
  { name: '京都', x: 6, y: 6 },
  { name: '大阪', x: 6, y: 7 },
  { name: '兵庫', x: 5, y: 6, h: 2 },
  { name: '奈良', x: 6, y: 8 },
  { name: '和歌山', x: 6, y: 9, w: 2 },
  { name: '鳥取', x: 4, y: 6 },
  { name: '島根', x: 3, y: 6 },
  { name: '岡山', x: 4, y: 7 },
  { name: '広島', x: 3, y: 7 },
  { name: '山口', x: 2, y: 6, h: 2 },
  { name: '徳島', x: 4, y: 9 },
  { name: '香川', x: 4, y: 8 },
  { name: '愛媛', x: 3, y: 8 },
  { name: '高知', x: 3, y: 9 },
  { name: '福岡', x: 1, y: 7 },
  { name: '佐賀', x: 0, y: 8 },
  { name: '長崎', x: 0, y: 7 },
  { name: '熊本', x: 0, y: 9 },
  { name: '大分', x: 1, y: 8 },
  { name: '宮崎', x: 1, y: 9 },
  { name: '鹿児島', x: 0, y: 10, w: 2 },
  { name: '沖縄', x: 4, y: 3 },
];

export default function JapanMapWidget({ data }: Props) {
  // 1. 集計ロジック
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    data.forEach((t: any) => {
      // t.prefs 配列に都道府県が入っている想定（または t.fkw など実際のデータ構造に合わせてください）
      const prefsArray = t.prefs || [];
      if (Array.isArray(prefsArray)) {
        prefsArray.forEach((prefName: string) => {
          let p = prefName.replace(/(府|県)$/, '');
          if (p === '東京都') p = '東京';
          if (p === '北海') p = '北海道';
          result[p] = (result[p] || 0) + 1;
        });
      }
    });
    return result;
  }, [data]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
      {/* ヘッダー部分 */}
      <div className="flex items-center gap-3 w-full mb-6">
        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
          <Map className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
            Japan Map
          </p>
          <h2 className="text-lg font-bold text-gray-900 leading-none">
            Footprints
          </h2>
        </div>
      </div>

      {/* 日本地図グリッド */}
      <div
        className="grid gap-0.5 sm:gap-1 w-full max-w-[400px]"
        // x軸:13マス, y軸:11マス のグリッドを作成
        style={{
          gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(11, minmax(0, 1fr))',
        }}
      >
        {JP_PREFS.map((pref) => {
          const count = counts[pref.name] || 0;
          const w = pref.w || 1;
          const h = pref.h || 1;

          // 色の決定（旧コードの青色ベースを採用しつつ、Tailwindに合わせて洗練）
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
              title={`${pref.name}: ${count}回`}
              className={`
                ${bgClass} ${textClass} rounded sm:rounded-md flex items-center justify-center 
                text-[8px] sm:text-[10px] font-bold transition-transform duration-300 
                hover:scale-125 hover:z-10 hover:shadow-md cursor-pointer whitespace-nowrap
              `}
              style={{
                // +1 しているのは、CSS Grid のライン番号が 1 から始まるため
                gridColumn: `${pref.x + 1} / span ${w}`,
                gridRow: `${pref.y + 1} / span ${h}`,
                aspectRatio: `${w} / ${h}`,
              }}
              // 必要に応じてクリックイベントを追加できます
              // onClick={() => console.log(pref.name)}
            >
              {/* マスが小さいので、長い名前は最初の2文字だけにするなどの工夫も可 */}
              {pref.name /*.substring(0, 2) */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
