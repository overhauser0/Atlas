'use client';
import React from 'react';
import { Task } from '@/types';
import { CalendarDays, Plus, ArrowRight } from 'lucide-react';
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
  // 本日の日付を取得 (UIのトーンに合わせて英語フォーマット)
  const today = new Date();
  const displayDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // 今日のタスク（完了していないもの）
  const todayString = today.toISOString().split('T')[0];
  const todaysTasks = tasks.filter(
    (task) =>
      task.due_date &&
      task.due_date.startsWith(todayString) &&
      task.status !== 'Done',
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in flex-1 overflow-y-auto noir-scrollbar">
      {/* --- ヘッダー：本日の日付 --- */}
      <header className="pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 text-neon mb-2">
          <CalendarDays className="w-6 h-6" />
          <span className="text-sm font-bold tracking-widest uppercase">
            Today
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wide">
          {displayDate}
        </h1>
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
                  {/* ステータスに応じた色のドット */}
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(task.status)} shadow-[0_0_8px_currentColor] opacity-70`}
                  />
                  <span className="text-base font-medium text-gray-200 group-hover:text-white transition-colors">
                    {task.title}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-neon transition-colors md:opacity-0 md:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
