// src/components/ui/PhotoHeatmap.tsx

'use client';

import React from 'react';

interface PhotoHeatmapProps {
  dailyCounts?: Record<string, number>;
  onDateClick: (date: string) => void;
}

export default function PhotoHeatmap({
  dailyCounts = {},
  onDateClick,
}: PhotoHeatmapProps) {
  // 今日から過去 52 週分（約364日）の日付データを生成
  const dates: { date: string; count: number }[] = [];
  const today = new Date();

  // 今日の曜日を取得（0: 日曜, 1: 月曜...）
  const dayOfWeek = today.getDay();
  // 52週間前の日曜日を開始点にする
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (52 * 7 + dayOfWeek));

  const currentDate = new Date(startDate);
  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dates.push({
      date: dateStr,
      count: dailyCounts[dateStr] || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 撮影件数に応じた草の色分け
  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 5) return 'bg-emerald-200';
    if (count <= 15) return 'bg-emerald-300';
    if (count <= 30) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-100"></span>
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 "></span>
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 "></span>
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 "></span>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-2">
        {/* w-max を指定してグリッド列が潰れるのを防止 */}
        <div className="w-max">
          {/* 7行（日〜土）で左から右へ流す */}
          <div className="grid grid-rows-7 grid-flow-col gap-1.5">
            {dates.map((item) => (
              <div
                key={item.date}
                className={`w-3 h-3 rounded-sm transition-transform hover:scale-125 hover:z-10 cursor-pointer ${getColorClass(
                  item.count,
                )}`}
                title={`${item.date}: ${item.count} photos`}
                onClick={() => onDateClick(item.date)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
