'use client';
import React, { useMemo, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  BarChart3,
} from 'lucide-react';
import { Task } from '@/types';
import { getThisWeekMonday } from '@/utils/dateUtils';
import SimpleList from '@/components/ui/SimpleList';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedTasks: Task[];
  targetDate: Date; // モーダルを開いた基準日（Homeなら今日、Weeklyならその日）
  openTaskModal: (task?: Partial<Task>) => void;
}

export default function StatsModal({
  isOpen,
  onClose,
  completedTasks,
  targetDate,
  openTaskModal,
}: StatsModalProps) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // --- 計算ロジック ---
  const stats = useMemo(() => {
    // 基準日のYYYY-MM-DD
    const targetDateStr = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tokyo',
    })
      .format(targetDate)
      .replace(/\//g, '-');

    // 今週の月曜日を取得（月曜始まり）
    const startOfThisWeek = getThisWeekMonday(targetDate);

    // 先週の月曜日を取得
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    let thisWeekTotal = 0;
    let lastWeekTotal = 0;

    // 曜日別のクリア数 [月, 火, 水, 木, 金, 土, 日]
    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    const targetDayTasks: Task[] = [];

    completedTasks.forEach((task) => {
      if (!task.start_date) return;
      const taskDateStr = task.start_date.substring(0, 10);
      const taskDate = new Date(taskDateStr);
      taskDate.setHours(0, 0, 0, 0);

      // 当該日のタスク抽出
      if (taskDateStr === targetDateStr) {
        targetDayTasks.push(task);
      }

      // 今週・先週の集計
      const timeDiff = taskDate.getTime() - startOfThisWeek.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

      if (daysDiff >= 0 && daysDiff < 7) {
        // 今週
        thisWeekTotal++;
        weeklyData[daysDiff]++;
      } else if (daysDiff >= -7 && daysDiff < 0) {
        // 先週
        lastWeekTotal++;
      }
    });

    // グラフの最大値（高さを相対的に計算するため）
    const maxVal = Math.max(...weeklyData, 1);

    const diff = thisWeekTotal - lastWeekTotal;

    return {
      thisWeekTotal,
      lastWeekTotal,
      diff,
      weeklyData,
      maxVal,
      targetDayTasks,
      targetDateStr,
    };
  }, [completedTasks, targetDate]);

  if (!isOpen) return null;

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-up overflow-hidden">
        {/* 装飾用アンビエントライト */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-neon/10 blur-[50px] pointer-events-none" />

        {/* ヘッダー */}
        <div className="relative flex items-center justify-between p-5 border-b border-white/5 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-neon" />
            <h2 className="text-lg font-bold text-white tracking-wider">
              Weekly Performance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロール領域 */}
        <div className="relative p-5 overflow-y-auto noir-scrollbar flex-1 flex flex-col gap-6 z-10">
          {/* サマリー（今週 vs 先週） */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-2">
                Last Week
              </span>
              <span className="text-2xl font-black text-gray-500">
                {stats.lastWeekTotal}
              </span>
            </div>

            <div className="bg-white/5 border border-neon/30 rounded-2xl p-4 relative overflow-hidden shadow-[0_0_15px_rgba(0,112,243,0.05)] flex flex-col justify-center">
              <span className="text-xs text-neon font-bold tracking-widest uppercase mb-2 relative z-10">
                This Week
              </span>
              <div className="flex items-end gap-3 relative z-10">
                <span className="text-4xl font-black text-white leading-none">
                  {stats.thisWeekTotal}
                </span>

                {/* 差分バッジ */}
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${
                    stats.diff > 0
                      ? 'text-green-400 bg-green-400/10 border-green-400/20'
                      : stats.diff < 0
                        ? 'text-red-400 bg-red-400/10 border-red-400/20'
                        : 'text-gray-400 bg-gray-400/10 border-gray-400/20'
                  }`}
                >
                  {stats.diff > 0 ? (
                    <>
                      <TrendingUp className="w-2.5 h-2.5" /> +{stats.diff}
                    </>
                  ) : stats.diff < 0 ? (
                    <>
                      <TrendingDown className="w-2.5 h-2.5" /> {stats.diff}
                    </>
                  ) : (
                    <>±0</>
                  )}
                </div>
              </div>
              {/* 薄いネオングロー */}
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-neon/20 blur-2xl rounded-full pointer-events-none" />
            </div>
          </div>

          {/* 簡易棒グラフ（曜日別） */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <h3 className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-4 text-center">
              Activity Chart
            </h3>
            <div className="flex justify-between h-28 px-1 gap-2">
              {stats.weeklyData.map((count, index) => {
                const heightPercent = (count / stats.maxVal) * 100;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 flex-1 h-full group"
                  >
                    {/* 棒の上の数字 */}
                    <span className="text-[10px] text-gray-500 group-hover:text-neon transition-colors font-bold h-4">
                      {count > 0 ? count : ''}
                    </span>
                    {/* 棒 */}
                    <div className="w-full max-w-6 bg-black/40 rounded-md relative flex-1 overflow-hidden border border-white/5">
                      <div
                        className="absolute bottom-0 w-full bg-neon shadow-[0_0_10px_rgba(0,112,243,0.5)] transition-all duration-700 ease-out rounded-sm"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    {/* 曜日ラベル */}
                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                      {weekLabels[index]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 当該日のタスクリスト */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-gray-400" />
              Cleared on {stats.targetDateStr}
            </h3>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
              <SimpleList
                tasks={stats.targetDayTasks}
                onTaskClick={openTaskModal}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
