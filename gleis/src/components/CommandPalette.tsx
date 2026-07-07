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
  Lock,
  Sparkles,
  MessageSquare,
  Wand2,
  ArrowRight,
} from 'lucide-react';
import { ViewType, Task } from '@/types';
import { atlasFetch } from '@/utils/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
  onSync: () => void;
  onNewTask: (task?: Partial<Task>) => void;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onQuickAlarmOpen: () => void;
  onLock: () => void;
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
  onLock,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [viewState, setViewState] = useState<'list' | 'ai-result'>('list');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // キーボード選択用のインデックス
  const [activeIndex, setActiveIndex] = useState(0);

  // コマンドの定義
  const commands = useMemo(
    () => [
      {
        id: 'new-task',
        label: 'New Task',
        icon: Plus,
        action: () => onNewTask(),
      },
      {
        id: 'sync',
        label: 'Sync with Notion',
        icon: RefreshCw,
        action: onSync,
      },
      {
        id: 'timer',
        label: 'Set Timer',
        icon: AlarmClock,
        action: onQuickAlarmOpen,
      },
      {
        id: 'nav-home',
        label: 'Go to Home',
        icon: LayoutDashboard,
        action: () => onNavigate('home'),
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
      { id: 'lock-app', label: 'Lock App', icon: Lock, action: onLock },
    ],
    [onNewTask, onSync, onQuickAlarmOpen, onNavigate, onLock],
  );

  // 1. コマンドのフィルタリング
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, commands]);

  // 2. タスクのフィルタリング
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return [];
    return tasks.filter((task) =>
      task.title?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, tasks]);

  // AI連携のハンドラー関数
  const handleBrainstorm = async () => {
    if (!search.trim()) return;
    setViewState('ai-result');
    setIsAiLoading(true);
    setAiResult(null);
    try {
      const response = await atlasFetch('/ai/brainstorm', {
        method: 'POST',
        body: JSON.stringify({ message: search }),
      });
      const data = await response.json();
      setAiResult(data.reply);
    } catch (e) {
      setAiResult('Error: Failed to get AI response.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleMagicCreate = async () => {
    if (!search.trim()) return;
    setViewState('ai-result');
    setIsAiLoading(true);
    setAiResult('Parsing task details...');
    try {
      const response = await atlasFetch('/ai/parse-task', {
        method: 'POST',
        body: JSON.stringify({ text: search }),
      });
      const parsedTaskData = await response.json();
      onNewTask(parsedTaskData);
      onClose();
    } catch (e) {
      onNewTask({ title: search });
      onClose();
    } finally {
      setIsAiLoading(false);
    }
  };

  // 3. 動的に変化するすべての選択肢（リスト上の全アイテム）を1つの配列にフラットに結合する
  const totalItems = useMemo(() => {
    if (viewState === 'ai-result') return [];

    const items = [];

    // コマンド部分
    filteredCommands.forEach((cmd) => {
      items.push({
        type: 'command',
        id: cmd.id,
        label: cmd.label,
        action: () => {
          cmd.action();
          onClose();
        },
      });
    });

    // タスク部分
    filteredTasks.forEach((task) => {
      items.push({
        type: 'task',
        id: task.id,
        label: task.title,
        action: () => {
          onTaskClick(task);
          onClose();
        },
      });
    });

    // スマートアクション部分（文字入力時のみ）
    if (search.trim().length > 0) {
      items.push({
        type: 'smart-create',
        id: 'sm-create',
        label: 'Create task',
        action: () => {
          onNewTask({ title: search });
          onClose();
        },
      });
      items.push({
        type: 'smart-magic',
        id: 'sm-magic',
        label: 'Magic Create',
        action: handleMagicCreate,
      });
      items.push({
        type: 'smart-ai',
        id: 'sm-ai',
        label: 'Ask AI',
        action: handleBrainstorm,
      });
    }

    return items;
  }, [viewState, filteredCommands, filteredTasks, search]);

  // 文字入力やビュー変更があったら、選択インデックスを一番上（0）にリセット
  useEffect(() => {
    setActiveIndex(0);
  }, [search, viewState]);

  // 開いたときの初期化
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setViewState('list');
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl noir-glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[70vh]">
        {/* === 検索入力エリア === */}
        <div className="flex items-center px-4 py-4 border-b border-white/5 shrink-0 bg-black/20">
          <Search className="w-5 h-5 text-gray-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setViewState('list');
            }}
            placeholder="Type a command, search tasks, or ask AI..."
            className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-gray-600 text-lg"
            onKeyDown={(e) => {
              // 上下キーおよびEnterキーのハンドリング
              if (viewState === 'list' && totalItems.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault(); // インプット内のカーソル移動（末尾へ行く挙動など）を防ぐ
                  setActiveIndex((prev) => (prev + 1) % totalItems.length); // 下限を超えたら一番上へループ
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex(
                    (prev) =>
                      (prev - 1 + totalItems.length) % totalItems.length,
                  ); // 上限を超えたら一番下へループ
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // 現在選択されているアクションを実行
                  totalItems[activeIndex]?.action();
                  return;
                }
              }

              // 空白時のEnterやAI結果表示中のEnter用フォールバック
              if (e.key === 'Enter' && search.trim() === '') {
                e.preventDefault();
              }
            }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setViewState('list');
                inputRef.current?.focus();
              }}
              className="text-gray-500 hover:text-white px-2 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* === 結果表示エリア === */}
        <div className="flex-1 overflow-y-auto noir-scrollbar py-2">
          {viewState === 'ai-result' ? (
            <div className="px-6 py-8 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center text-neon space-y-4 py-8">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                  <span className="tracking-widest uppercase text-xs font-bold opacity-80">
                    Atlas AI is thinking...
                  </span>
                </div>
              ) : (
                <div>{aiResult}</div>
              )}
            </div>
          ) : (
            <>
              {/* 1. コマンド一覧 */}
              {filteredCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/2 mb-1">
                    Commands
                  </div>
                  {filteredCommands.map((cmd) => {
                    const Icon = cmd.icon;
                    // インデックスが一致しているか判定
                    const globalIdx = totalItems.findIndex(
                      (item) => item.type === 'command' && item.id === cmd.id,
                    );
                    const isSelected = globalIdx === activeIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        // 選択状態のスタイル（bg-white/10）を動的に付与
                        className={`w-full flex items-center px-4 py-2.5 text-left transition-colors group ${isSelected ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
                      >
                        <Icon
                          className={`w-4 h-4 mr-3 transition-colors ${isSelected ? 'text-neon' : 'text-gray-500 group-hover:text-neon'}`}
                        />
                        <span
                          className={`text-sm font-medium transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}
                        >
                          {cmd.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. タスク一覧 */}
              {filteredTasks.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/2 border-y border-white/5 mb-1">
                    Matching Tasks
                  </div>
                  {filteredTasks.map((task) => {
                    const globalIdx = totalItems.findIndex(
                      (item) => item.type === 'task' && item.id === task.id,
                    );
                    const isSelected = globalIdx === activeIndex;

                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          onTaskClick(task);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors group ${isSelected ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
                      >
                        <div className="flex items-center min-w-0 flex-1 pr-4">
                          <CheckSquare
                            className={`w-4 h-4 mr-3 shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`}
                          />
                          <span
                            className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {task.date && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-gray-600" />
                              {task.date.split('T')[0].substring(5)}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-white/5 text-gray-400 bg-white/2 uppercase tracking-wider">
                            {task.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. スマートアクション */}
              {search.trim().length > 0 && (
                <div className="mt-2 border-t border-white/10 pt-2 bg-black/20">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-neon uppercase tracking-wider mb-1">
                    Smart Actions
                  </div>

                  {/* 🌟 各アクションにインデックス判定を追加 */}
                  {(() => {
                    const createIdx = totalItems.findIndex(
                      (i) => i.type === 'smart-create',
                    );
                    const magicIdx = totalItems.findIndex(
                      (i) => i.type === 'smart-magic',
                    );
                    const aiIdx = totalItems.findIndex(
                      (i) => i.type === 'smart-ai',
                    );

                    return (
                      <>
                        <button
                          onClick={() => {
                            onNewTask({ title: search });
                            onClose();
                          }}
                          className={`w-full flex items-center px-4 py-3 text-left transition-colors ${activeIndex === createIdx ? 'bg-white/10 text-white' : 'hover:bg-white/10'}`}
                        >
                          <Plus className="w-4 h-4 mr-3 text-blue-400" />
                          <span className="text-sm font-medium text-gray-300">
                            Create task:{' '}
                            <span className="text-white">"{search}"</span>
                          </span>
                        </button>

                        <button
                          onClick={handleMagicCreate}
                          className={`w-full flex items-center px-4 py-3 text-left transition-colors ${activeIndex === magicIdx ? 'bg-white/10 text-white' : 'hover:bg-white/10'}`}
                        >
                          <Wand2 className="w-4 h-4 mr-3 text-purple-400" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-300 block">
                              Magic Create task:{' '}
                              <span className="text-white">"{search}"</span>
                            </span>
                          </div>
                          <ArrowRight
                            className={`w-4 h-4 text-gray-400 transition-opacity ${activeIndex === magicIdx ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </button>

                        <button
                          onClick={handleBrainstorm}
                          className={`w-full flex items-center px-4 py-3 text-left transition-colors ${activeIndex === aiIdx ? 'bg-white/10 text-white' : 'hover:bg-white/10'}`}
                        >
                          <MessageSquare className="w-4 h-4 mr-3 text-green-400" />
                          <span className="text-sm font-medium text-gray-300">
                            Ask Atlas AI about{' '}
                            <span className="text-white">"{search}"</span>
                          </span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {!search.trim() && filteredCommands.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  Start typing to explore...
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 text-[10px] text-gray-500 uppercase tracking-wider flex justify-between shrink-0">
          <span>↑↓ to navigate • Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
