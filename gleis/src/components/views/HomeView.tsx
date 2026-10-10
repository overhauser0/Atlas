'use client';
import React, { useMemo, useState } from 'react';
import { Task } from '@/types';
import {
  ArrowRight,
  ExternalLink,
  HardDrive,
  Award,
  ListChecks,
  CornerDownRight,
  Search,
} from 'lucide-react';
import {
  getStatusColor,
  sortTasksByStatus,
  getNotionLinkById,
} from '@/utils/miscellaneousUtils';
import { getDateFullString } from '@/utils/dateUtils';
import DateSelector from '@/components/ui/DateSelector';
import FAB from '@/components/ui/FAB';
import Card from '@/components/ui/Card';
import SimpleList from '@/components/ui/SimpleList';

interface HomeViewProps {
  tasks: Task[];
  subTaskMap: Record<string, { total: number; done: number }>;
  openTaskModal: (task?: Partial<Task>) => void;
  completedTasks: Task[];
  wrapperTasks: Task[];
  onOpenStats: () => void;
  onOpenCommandPalette?: () => void;
}

export default function HomeView({
  tasks,
  subTaskMap,
  completedTasks,
  wrapperTasks,
  openTaskModal,
  onOpenStats,
  onOpenCommandPalette,
}: HomeViewProps) {
  // 1. 日付選択のステート（デフォルトは今日）
  const [targetDate, setTargetDate] = useState(new Date());

  // 選択された日付のJST文字列 (YYYY-MM-DD)
  const targetDateString = useMemo(() => {
    return getDateFullString(targetDate, 'hyphen');
  }, [targetDate]);

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
      {/* --- 1. ヘッダーエリア (日付 ＆ Spotlight) --- */}
      <div className="shrink-0 mb-6 flex flex-col gap-4">
        <DateSelector currentDate={targetDate} onChange={setTargetDate} />

        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-4 py-3.5 noir-glass rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all group text-left shadow-lg"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-500 group-hover:text-gray-400 transition-colors" />
              <span className="text-gray-500 group-hover:text-gray-400 text-sm transition-colors">
                Type a command, search tasks, or ask AI...
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <kbd className="px-2 py-1 text-[10px] font-mono bg-white/10 text-gray-400 rounded border border-white/10">
                Ctrl
              </kbd>
              <kbd className="px-2 py-1 text-[10px] font-mono bg-white/10 text-gray-400 rounded border border-white/10">
                K
              </kbd>
            </div>
          </button>
        )}
      </div>

      {/* --- 2. メインコンテンツ (2カラムレイアウト) --- */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* 【左カラム】: メインタスクリスト */}
        <section className="order-2 md:order-1 flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <h2 className="shrink-0 text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
              Today's Tasks
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
                sortedTargetTasks.map((task) => {
                  const countData = subTaskMap[task.id];
                  const isAllDone =
                    countData &&
                    countData.total > 0 &&
                    countData.done === countData.total;
                  return (
                    <Card
                      key={task.id}
                      size="sm"
                      hoverable
                      onClick={() => openTaskModal(task)}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`noir-dot ${getStatusColor(task.status)}`}
                        />
                        <div className="text-base font-medium text-gray-200 group-hover:text-white transition-colors">
                          {task.title}
                          {task.source === 'LOCAL' && (
                            <HardDrive className="w-4 h-4 inline-block ml-2 text-white/20 group-hover:text-white/40 transition-colors align-text-bottom" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2">
                        {task.parent_id && (
                          <div
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border bg-orange-400/10 border-orange-400/20"
                            title="Has Parent Project"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          </div>
                        )}
                        {countData && (
                          <div
                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border ${
                              isAllDone
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                            }`}
                            title="Subtasks progress"
                          >
                            <ListChecks className="w-3 h-3" />
                            <span>
                              {countData.done}/{countData.total}
                            </span>
                          </div>
                        )}
                        {task.source === 'NOTION' && (
                          <a
                            href={getNotionLinkById(task.id)}
                            target="_self"
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
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* 【右カラム】: ステータス ＆ 情報パネル */}
        <aside className="order-1 md:order-2 shrink-0 md:w-72 lg:w-92 flex flex-col">
          <h2 className="hidden md:flex shrink-0 text-sm font-bold tracking-widest text-gray-500 uppercase mb-4  items-center gap-2">
            Info
          </h2>
          <div className="flex flex-col gap-2">
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
                  Cleared Today
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
            <div className="mt-3 hidden md:block">
              <h2 className="shrink-0 text-sm font-bold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
                Project
              </h2>
              <div className="max-h-72 overflow-y-auto noir-scrollbar rounded-xl border border-white/5 bg-black/20 p-1">
                <SimpleList
                  tasks={wrapperTasks}
                  onTaskClick={(task) => openTaskModal(task)}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* --- 3. FAB --- */}
      <FAB onClick={() => openTaskModal()} />
    </div>
  );
}
