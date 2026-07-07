// src/components/MeetingView.tsx
'use client';

import { useState, useMemo } from 'react';
import { FileText, Plus, ChevronRight, Clock, Search } from 'lucide-react';
import { getStatusColor } from '@/utils/miscellaneousUtils';
import { Task } from '@/types';

interface MeetingProps {
  meetingTasks: Task[];
  openTaskModal: (task?: Partial<Task>) => void;
}

type MeetingTemplate = {
  id: string;
  title: string;
  fkw: string[];
};

const MEETING_TYPES: MeetingTemplate[] = [
  { id: 'mtg', title: '会議', fkw: [] },
  { id: 'new', title: '新規面談', fkw: ['新規面談'] },
  { id: 'current', title: '現生徒', fkw: ['現生徒面談'] },
  {
    id: 'strategy',
    title: '受験戦略コーチング',
    fkw: ['受験戦略コーチング'],
  },
  { id: 'manual', title: 'トリセツ', fkw: ['トリセツ'] },
];

const TaskGroup = ({
  title,
  tasks,
  openTaskModal,
  formatMinimalDate,
}: {
  title: string;
  tasks: Task[];
  openTaskModal: (task?: Partial<Task>) => void;
  formatMinimalDate: (dateString?: string | null) => string;
}) => {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6 last:mb-0 animate-fade-in">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
        <Clock className="w-3 h-3" />
        {title}
        <span className="text-gray-600 font-normal">({tasks.length})</span>
      </h3>
      <div className="space-y-1">
        {tasks.map((task) => {
          const fkwList: string[] = (task as any).fkw || [];

          return (
            <button
              key={task.id}
              onClick={() => openTaskModal(task)}
              className="w-full flex items-center justify-between p-3 group rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all"
            >
              {/* 1. ステータスドット */}
              <div className="shrink-0 mr-3 flex items-center justify-center">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${getStatusColor(
                    task.status,
                  )}`}
                />
              </div>

              {/* 中央コンテンツ */}
              <div className="flex-1 min-w-0 pr-4 text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                    {task.title || 'Untitled Meeting'}
                  </h4>

                  {/* 2. FKW チップ表示 */}
                  {fkwList.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0 overflow-hidden">
                      {fkwList.map((kw, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400 bg-white/5 truncate max-w-20"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {task.note && (
                  <p className="text-xs text-gray-500 truncate max-w-full">
                    {task.note}
                  </p>
                )}
              </div>

              {/* 右側: 日付と矢印 */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-gray-600 group-hover:text-gray-400 transition-colors">
                  {formatMinimalDate(task.date)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function MeetingView({
  meetingTasks,
  openTaskModal,
}: MeetingProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleQuickCreate = (title: string, fkw: string[]) => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const mmdd = `${mm}${dd}`;

    openTaskModal({
      title: `${title}${mmdd}`,
      type: 'Note',
      topics: ['Meeting'],
      fkw: fkw || [],
      source: 'NOTION',
    });
  };

  // タスクの検索フィルタリングとグループ化
  const { groups, hasMore } = useMemo(() => {
    const groups = {
      upcoming: [] as Task[],
      week: [] as Task[],
      month: [] as Task[],
      older: [] as Task[],
    };

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const msPerDay = 24 * 60 * 60 * 1000;

    // 1. 検索クエリでフィルタリング
    let filtered = meetingTasks;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = meetingTasks.filter((task) => {
        // FKW（Free KeyWord）の検索対応 (型定義にfkwがない場合は as any等で適宜回避)
        const fkwMatch = (task as any).fkw?.some((kw: string) =>
          kw.toLowerCase().includes(lowerQuery),
        );
        return (
          task.title?.toLowerCase().includes(lowerQuery) ||
          task.note?.toLowerCase().includes(lowerQuery) ||
          fkwMatch
        );
      });
    }

    const hasMore = filtered.length > 50;

    // 2. 期間ごとにグループ分け
    filtered.slice(0, 50).forEach((task) => {
      if (!task.date) {
        groups.older.push(task);
        return;
      }

      const tDate = new Date(task.date);
      const tTime = new Date(
        tDate.getFullYear(),
        tDate.getMonth(),
        tDate.getDate(),
      ).getTime();
      const diffDays = (today - tTime) / msPerDay;

      if (diffDays < 0) {
        groups.upcoming.push(task);
      } else if (diffDays <= 7) {
        groups.week.push(task);
      } else if (diffDays <= 30) {
        groups.month.push(task);
      } else {
        groups.older.push(task);
      }
    });

    return { groups, hasMore };
  }, [meetingTasks, searchQuery]);

  const formatMinimalDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // 全タスクをチェックして表示内容があるか判定
  const hasAnyTasks = Object.values(groups).some((group) => group.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 3. ヘッダーエリア (クイックアクション + Search Bar) */}
      <div className="shrink-0 p-4 border-b border-white/5 bg-white/2 space-y-3">
        {/* クイックアクションバー */}
        <div className="flex items-center gap-2 overflow-x-auto noir-scrollbar pb-1">
          {MEETING_TYPES.map(({ id, title, fkw }) => (
            <button
              key={id}
              onClick={() => handleQuickCreate(title, fkw)}
              className="flex items-center gap-1.5 px-4 py-2 shrink-0 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all group"
            >
              <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-neon transition-colors" />
              {title}
            </button>
          ))}
        </div>

        {/* 検索バー */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-neon transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search meetings (title, notes, tags)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/10 text-gray-200 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* メイン: グループ化されたリスト */}
      <div className="flex-1 overflow-y-auto noir-scrollbar p-4">
        {!hasAnyTasks ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3">
            <FileText className="w-8 h-8 opacity-50" />
            <p className="text-sm">
              {searchQuery
                ? 'No matching meetings found.'
                : 'No meetings found.'}
            </p>
          </div>
        ) : (
          <div className="pb-8">
            <TaskGroup
              title="Upcoming"
              tasks={groups.upcoming}
              openTaskModal={openTaskModal}
              formatMinimalDate={formatMinimalDate}
            />
            <TaskGroup
              title="Last 7 Days"
              tasks={groups.week}
              openTaskModal={openTaskModal}
              formatMinimalDate={formatMinimalDate}
            />
            <TaskGroup
              title="Last 30 Days"
              tasks={groups.month}
              openTaskModal={openTaskModal}
              formatMinimalDate={formatMinimalDate}
            />
            <TaskGroup
              title="Older"
              tasks={groups.older}
              openTaskModal={openTaskModal}
              formatMinimalDate={formatMinimalDate}
            />
            {hasMore && (
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-gray-500 select-none">
                <span className="text-[10px] uppercase tracking-widest text-center">
                  Showing top 50 results.
                  <br className="sm:hidden" /> For older records, please refer
                  to Notion.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
