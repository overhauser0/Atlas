'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Task } from '@/types';
import {
  CalendarDays,
  Plus,
  ArrowRight,
  ExternalLink,
  HardDrive,
} from 'lucide-react';
import { getStatusColor } from '@/utils/dateUtils';

interface DashboardViewProps {
  tasks: Task[];
  onOpenTaskModal: () => void;
  onTaskClick: (task: Task) => void;
}

export default function DashboardView({
  tasks,
  onOpenTaskModal,
  onTaskClick,
}: DashboardViewProps) {
  const today = new Date();

  // --- 1. 表示用日付の取得 ---
  const displayDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });

  // --- 2. フィルタリング用のJST日付文字列 (YYYY-MM-DD) の生成 ---
  const todayString = useMemo(() => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tokyo',
    })
      .format(today)
      .replace(/\//g, '-'); // YYYY/MM/DD -> YYYY-MM-DD に変換
  }, [today]);

  // --- 3. 1年の進捗計算 ---
  const yearProgress = useMemo(() => {
    // 1. まず今日の日付をJSTの文字列 (YYYY/MM/DD, HH:MM:SS) で取得
    const jstString = today.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });

    // 2. それを元にJST基準の「現在のDate」を作る
    const jstDate = new Date(jstString);

    // 3. JST基準の「年」を数値で取得
    const currentYear = jstDate.getFullYear();

    // 4. その年の最初と最後の日時 (ローカル時間として扱う)
    const start = new Date(currentYear, 0, 1).getTime();
    const end = new Date(currentYear + 1, 0, 1).getTime();
    const now = jstDate.getTime();

    // 5. 進捗率の計算
    const progress = (now - start) / (end - start);
    return Math.floor(Math.max(0, Math.min(100, progress * 100)));
  }, [today]);

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(yearProgress);
    }, 100);

    return () => clearTimeout(timer);
  }, [yearProgress]);

  // 今日のタスク（完了していないもの）をフィルタリング
  const todaysTasks = tasks.filter(
    (task) =>
      task.due_date &&
      task.due_date.startsWith(todayString) &&
      task.status !== 'Done',
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in flex-1 overflow-y-auto noir-scrollbar">
      {/* --- ヘッダー：アイコン・日付・年の進捗バー --- */}
      <header className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-neon shadow-[0_0_15px_rgba(0,112,243,0.2)]">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {displayDate}
          </h1>
        </div>

        {/* 右側：1年の進捗バー */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            <span>{today.getFullYear()} Progress</span>
            {/* 数値は目標値を表示 */}
            <span className="text-neon">{yearProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-neon shadow-[0_0_10px_rgba(0,112,243,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </div>
      </header>

      {/* --- ショートカット --- */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onOpenTaskModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
          >
            <Plus className="w-5 h-5 text-neon group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">
              New Task
            </span>
          </button>
        </div>
      </section>

      {/* --- 今日のタスク --- */}
      <section>
        <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
          Today's Tasks
          <span className="bg-white/10 text-gray-300 px-2 py-0.5 rounded-full text-xs">
            {todaysTasks.length}
          </span>
        </h2>

        <div className="grid gap-3">
          {todaysTasks.length === 0 ? (
            <div className="p-8 rounded-2xl noir-glass border border-white/5 text-center text-gray-500">
              No tasks for today. Take a rest!
            </div>
          ) : (
            todaysTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="group flex items-center justify-between p-4 rounded-xl noir-glass border border-white/5 hover:border-white/20 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(task.status)} shadow-[0_0_8px_currentColor] opacity-70`}
                  />
                  <div className="text-base font-medium text-gray-200 group-hover:text-white transition-colors">
                    {task.title}
                    {task.source === 'LOCAL' && (
                      <HardDrive
                        className="w-4 h-4 inline-block ml-2 text-white/20 group-hover:text-white/40 transition-colors align-text-bottom"
                        title="Local Task"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  {task.source === 'NOTION' && (
                    <a
                      href={`https://notion.so/${task.id.replace(/-/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <div className="p-2">
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-neon transition-all md:opacity-0 md:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
