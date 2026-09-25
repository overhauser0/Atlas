'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Task } from '@/types';
import { ArrowRight, ExternalLink, HardDrive, Award } from 'lucide-react';
import {
  getStatusColor,
  sortTasksByStatus,
  getNotionLinkById,
} from '@/utils/miscellaneousUtils';
import { getDateFullString } from '@/utils/dateUtils';
import DateSelector from '@/components/ui/DateSelector';
import FAB from '@/components/ui/FAB';
import Card from '@/components/ui/Card';

interface HomeViewProps {
  tasks: Task[];
  openTaskModal: (task?: Partial<Task>) => void;
  completedTasks: Task[];
  onOpenStats: () => void;
}

export default function HomeView({
  tasks,
  completedTasks,
  openTaskModal,
  onOpenStats,
}: HomeViewProps) {
  // 1. 日付選択のステート（デフォルトは今日）
  const [targetDate, setTargetDate] = useState(new Date());

  // 選択された日付のJST文字列 (YYYY-MM-DD)
  const targetDateString = useMemo(() => {
    return getDateFullString(targetDate, 'hyphen');
  }, [targetDate]);

  // 2. 1年の進捗計算（選択中の日付を基準）
  const yearProgress = useMemo(() => {
    const currentYear = targetDate.getFullYear();
    const start = new Date(currentYear, 0, 1).getTime();
    const end = new Date(currentYear + 1, 0, 1).getTime();
    const now = targetDate.getTime();
    const progress = (now - start) / (end - start);
    return Math.floor(Math.max(0, Math.min(100, progress * 100)));
  }, [targetDate]);

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(yearProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [yearProgress]);

  // 選択した日のタスク（完了していないもの）をフィルタリング
  const targetTasks = tasks.filter(
    (task) =>
      task.date &&
      task.date.startsWith(targetDateString) &&
      task.status !== 'Done',
  );
  const sortedTargetTasks = sortTasksByStatus(targetTasks);

  // 選択した日の完了済みタスク
  const completedTargetTasks = completedTasks.filter(
    (task) =>
      task.date &&
      task.date.startsWith(targetDateString) &&
      task.status === 'Done',
  );

  return (
    <div className="px-4 animate-fade-in flex-1 flex flex-col h-full min-h-0 relative">
      {/* --- 1. 日付セレクター --- */}
      <div className="shrink-0 mb-6">
        <DateSelector currentDate={targetDate} onChange={setTargetDate} />
      </div>

      {/* --- 2. ミニStatsカード (1年の進捗 ＆ その日の完了数) --- */}
      <div className="shrink-0 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1年の進捗カード */}
        <Card size="sm" className="flex flex-col justify-center gap-3">
          <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            <span>{targetDate.getFullYear()} Progress</span>
            <span className="text-neon">{yearProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-neon shadow-[0_0_10px_rgba(0,112,243,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </Card>

        {/* 完了タスク数カード（クリックでStatsViewへ） */}
        <Card
          size="sm"
          hoverable
          onClick={onOpenStats}
          className="flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg transition-colors duration-500 ${
                completedTargetTasks.length > 0
                  ? 'bg-neon/10 text-neon'
                  : 'bg-white/5 text-gray-500'
              }`}
            >
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-gray-400 group-hover:text-gray-300 transition-colors">
              Cleared
            </span>
          </div>
          <span
            className={`text-2xl transition-colors duration-500 ${
              completedTargetTasks.length > 0
                ? 'text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                : 'text-gray-600 font-bold'
            }`}
          >
            {completedTargetTasks.length}
          </span>
        </Card>
      </div>

      {/* --- 3. メインタスクリスト --- */}
      <section className="flex-1 flex flex-col min-h-0">
        <h2 className="shrink-0 text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
          Target Tasks
          <span className="bg-white/10 text-gray-300 px-2 py-0.5 rounded-full text-xs">
            {sortedTargetTasks.length}
          </span>
        </h2>

        <div className="flex-1 overflow-y-auto noir-scrollbar pr-2 pb-24 grid gap-3 content-start">
          {sortedTargetTasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center text-gray-500 text-sm">
              No tasks for this day. Take a rest!
            </div>
          ) : (
            sortedTargetTasks.map((task) => (
              <Card
                key={task.id}
                size="sm"
                hoverable
                onClick={() => openTaskModal(task)}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`noir-dot ${getStatusColor(task.status)}`} />
                  <div className="text-base font-medium text-gray-200 group-hover:text-white transition-colors">
                    {task.title}
                    {task.source === 'LOCAL' && (
                      <HardDrive className="w-4 h-4 inline-block ml-2 text-white/20 group-hover:text-white/40 transition-colors align-text-bottom" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  {task.source === 'NOTION' && (
                    <a
                      href={getNotionLinkById(task.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all opacity-100"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  <div className="p-2">
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-neon transition-all md:-translate-x-2 group-hover:translate-x-0" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* --- 4. FAB (Floating Action Button) --- */}
      <FAB onClick={() => openTaskModal()} />
    </div>
  );
}
