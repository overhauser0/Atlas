'use client';
import React, { useMemo, useEffect } from 'react';
import { X, Trophy, TrendingUp, CalendarCheck, ArrowRight } from 'lucide-react';
import { Task } from '@/types';
import { getThisWeekMonday } from '@/utils/dateUtils';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedTasks: Task[];
  targetDate: Date; // モーダルを開いた基準日（Homeなら今日、Weeklyならその日）
  onTaskClick: (task: Task) => void; // タスククリック時のコールバック
}

export default function StatsModal({
  isOpen,
  onClose,
  completedTasks,
  targetDate,
  onTaskClick,
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
      if (!task.date) return;
      const taskDateStr = task.date.substring(0, 10);
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

    return {
      thisWeekTotal,
      lastWeekTotal,
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-neon" />
            <h2 className="text-lg font-bold text-white tracking-wider">
              Performance
            </h2>
          </div>
          <button onClick={onClose} className="noir-icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロール領域 */}
        <div className="p-5 overflow-y-auto noir-scrollbar flex-1 flex flex-col gap-8">
          {/* サマリー（今週 vs 先週） */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-1">
                Last Week
              </span>
              <span className="text-2xl font-black text-gray-500">
                {stats.lastWeekTotal}
              </span>
            </div>
            <div className="bg-white/5 border border-neon/30 rounded-xl p-4 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(0,112,243,0.1)]">
              <span className="text-xs text-neon font-bold tracking-widest uppercase mb-1">
                This Week
              </span>
              <span className="text-3xl font-black text-white">
                {stats.thisWeekTotal}
              </span>
            </div>
          </div>

          {/* 簡易棒グラフ（曜日別） */}
          <div>
            <h3 className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-4 text-center">
              Weekly Activity
            </h3>
            <div className="flex justify-between h-32 px-2 gap-2">
              {stats.weeklyData.map((count, index) => {
                const heightPercent = (count / stats.maxVal) * 100;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 flex-1 h-full group"
                  >
                    {/* 棒の上の数字（ホバー時に明るく） */}
                    <span className="text-[10px] text-gray-500 group-hover:text-neon transition-colors font-bold">
                      {count}
                    </span>
                    {/* 棒 */}
                    <div className="w-full bg-white/5 rounded-md relative flex-1 overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-neon shadow-[0_0_10px_rgba(0,112,243,0.4)] transition-all duration-700 ease-out rounded-md"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    {/* 曜日ラベル */}
                    <span className="text-[10px] text-gray-600 font-bold uppercase">
                      {weekLabels[index]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-white/5" />

          {/* 当該日のタスクリスト */}
          <div>
            <h3 className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-gray-400" />
              Cleared on {stats.targetDateStr}
            </h3>
            {stats.targetDayTasks.length === 0 ? (
              <div className="text-center p-4 text-sm text-gray-600 bg-white/5 rounded-xl border border-white/5">
                No tasks cleared on this date.
              </div>
            ) : (
              <ul className="space-y-2">
                {stats.targetDayTasks.map((task) => (
                  <li
                    key={task.id}
                    className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 group"
                    onClick={() => {
                      onTaskClick(task);
                    }}
                  >
                    <Trophy className="w-4 h-4 text-neon shrink-0 opacity-70" />
                    <span className="text-sm font-medium text-gray-300 truncate grow-1">
                      {task.title}
                    </span>
                    <ArrowRight className="w-5 h-5 text-gray-600 shrink-0 group-hover:text-neon transition-all md:-translate-x-2 group-hover:translate-x-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
