'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Settings,
  LayoutDashboard,
  Columns2,
  Kanban,
  CalendarDays,
  Bell,
  CheckSquare,
  Calendar,
  ClipboardPenLine,
  AlarmClock,
} from 'lucide-react';
import { ViewType, Task } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
  onSync: () => void;
  onNewTask: () => void;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onQuickAlarmOpen: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSync,
  onNewTask,
  tasks,
  onTaskClick,
  onQuickAlarmOpen,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // コマンドの定義
  const commands = [
    { id: 'new-task', label: 'New Task', icon: Plus, action: onNewTask },
    { id: 'sync', label: 'Sync with Notion', icon: RefreshCw, action: onSync },
    {
      id: 'timer',
      label: 'Set Timer',
      icon: AlarmClock,
      action: onQuickAlarmOpen,
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      action: () => onNavigate('dashboard'),
    },
    {
      id: 'nav-weekly',
      label: 'Go to Weekly Tasks',
      icon: Columns2,
      action: () => onNavigate('weekly'),
    },
    {
      id: 'nav-kanban',
      label: 'Go to Kanban',
      icon: Kanban,
      action: () => onNavigate('kanban'),
    },
    {
      id: 'nav-calendar',
      label: 'Go to Calendar',
      icon: CalendarDays,
      action: () => onNavigate('calendar'),
    },
    {
      id: 'nav-review',
      label: 'Go to Review',
      icon: ClipboardPenLine,
      action: () => onNavigate('review'),
    },
    {
      id: 'nav-notifications',
      label: 'Go to Notifications',
      icon: Bell,
      action: () => onNavigate('notifications'),
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      icon: Settings,
      action: () => onNavigate('settings'),
    },
  ];

  // 1. コマンドのフィルタリング
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()),
  );

  // 2. タスクのフィルタリング（検索文字が入力されている時のみ検索対象にする）
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return [];
    return tasks.filter((task) =>
      task.title?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, tasks]);

  // 開いたときに自動で検索窓にフォーカス
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Escキーで閉じる処理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 画面全体の候補数がゼロかどうか
  const hasResults = filteredCommands.length > 0 || filteredTasks.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
      {/* 背景のぼかしとオーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* コマンドパレット本体 */}
      <div className="relative w-full max-w-lg noir-glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[60vh]">
        {/* 検索入力エリア */}
        <div className="flex items-center px-4 py-3 border-b border-white/5 shrink-0">
          <Search className="w-5 h-5 text-gray-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands or tasks..."
            className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-gray-600 text-lg pl-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Enterを押した時の汎用確定ロジック
                if (filteredCommands.length > 0) {
                  filteredCommands[0].action();
                  onClose();
                } else if (filteredTasks.length > 0) {
                  onTaskClick(filteredTasks[0]);
                  onClose();
                }
              }
            }}
          />
        </div>

        {/* 結果リストエリア（スクロール可能領域） */}
        <div className="flex-1 overflow-y-auto noir-scrollbar py-2">
          {!hasResults ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No results found.
            </div>
          ) : (
            <>
              {/* コマンド一覧のレンダリング */}
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-left hover:bg-white/5 transition-colors group"
                  >
                    <Icon className="w-4 h-4 mr-3 text-gray-500 group-hover:text-neon transition-colors" />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors pl-1">
                      {cmd.label}
                    </span>
                  </button>
                );
              })}

              {/* タスク一覧のレンダリング */}
              {filteredTasks.length > 0 && (
                <div className="mt-2">
                  {/* セクションヘッダー */}
                  <div className="px-4 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/[0.02] border-y border-white/5 mb-1">
                    Matching Tasks
                  </div>

                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        onTaskClick(task);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors group"
                    >
                      {/* 左側: アイコン と タスク名 */}
                      <div className="flex items-center min-w-0 flex-1 pr-4">
                        <CheckSquare className="w-4 h-4 mr-3 text-gray-500 group-hover:text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white truncate pl-1">
                          {task.title}
                        </span>
                      </div>

                      {/* 右側: 期限 と 状態バッジ（色なし） */}
                      <div className="flex items-center gap-3 shrink-0">
                        {task.dueDate && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-gray-600" />
                            {task.dueDate.split('T')[0].substring(5)}{' '}
                            {/* MM-DD 形式でスマートに表示 */}
                          </span>
                        )}
                        {/* 状態バッジ（色なしのモノトーン・ミニマル仕様） */}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-white/5 text-gray-400 bg-white/[0.02] group-hover:border-white/10 group-hover:text-gray-300 transition-colors uppercase tracking-wider">
                          {task.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター（ヘルプテキスト） */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 text-[10px] text-gray-500 uppercase tracking-wider flex justify-between shrink-0">
          <span>Search tasks by typing keywords</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
