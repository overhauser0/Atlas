'use client';
import { useState } from 'react';
import { Plus, ExternalLink, HardDrive } from 'lucide-react';
import { Task } from '@/types';
import {
  COLUMNS,
  getStatusColor,
  getColumnName,
  calculateNewDateWithPreservedTime,
  STATUS_ORDER,
} from '@/utils/dateUtils';

interface Props {
  appSettings: { shrinkEmptyPastDays: boolean };
  tasks: Task[];
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onOpenTaskModal: () => void;
  onTaskClick: (task: Task) => void;
}

export default function WeeklyView({
  appSettings,
  tasks,
  loading,
  setTasks,
  onOpenTaskModal,
  onTaskClick,
}: Props) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    task: Task | null;
  }>({ isOpen: false, mode: 'create', task: null });
  const [editForm, setEditForm] = useState({
    title: '',
    status: 'INBOX',
    due_date: '',
    source: 'LOCAL',
  });
  const [isSaving, setIsSaving] = useState(false);

  const todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    new Date().getDay()
  ];

  const onDrop = async (targetColumn: string) => {
    if (!draggingTaskId || targetColumn === 'Overdue') {
      setDraggingTaskId(null);
      return;
    }
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task) return;
    const newDate = calculateNewDateWithPreservedTime(
      task.due_date,
      targetColumn,
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, due_date: newDate } : t,
      ),
    );
    setDraggingTaskId(null);

    // バックエンドの更新
    await fetch(`/api/v1/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, dueDate: newDate, source: task.source }),
    });
  };

  const openEditModal = (task: Task) => {
    setEditForm({
      title: task.title,
      status: task.status,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      source: task.source || 'LOCAL',
    });
    setModalConfig({ isOpen: true, mode: 'edit', task });
  };

  return (
    <>
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 snap-x snap-mandatory flex gap-5 pb-2 noir-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full w-full text-gray-400 animate-pulse">
            Loading Tasks...
          </div>
        ) : (
          COLUMNS.map((colName) => {
            // ① フィルタリング
            const filteredTasks = tasks.filter((t) => {
              return (
                getColumnName(t.due_date) === colName && t.status !== 'Done'
              );
            });

            // ② ソート処理を追加
            const colTasks = filteredTasks.sort((a, b) => {
              const statusA = a.status || '';
              const statusB = b.status || '';

              // ステータスの優先度比較
              const priorityA = STATUS_ORDER[statusA] || 99;
              const priorityB = STATUS_ORDER[statusB] || 99;

              if (priorityA !== priorityB) {
                return priorityA - priorityB;
              }

              // 同一ステータス内の場合はタイトル順（昇順）
              return (a.title || '').localeCompare(b.title || '', 'ja');
            });
            const todayIndex = COLUMNS.indexOf(todayName);
            const colIndex = COLUMNS.indexOf(colName);
            const shouldShrink =
              appSettings.shrinkEmptyPastDays &&
              colIndex < todayIndex &&
              colTasks.length === 0;
            const isToday = colName === todayName;
            const isOverdue = colName === 'Overdue';

            return (
              <div
                key={colName}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(colName)}
                className={`${shouldShrink ? 'w-[112px]' : 'w-[280px]'} ${isToday ? 'bg-neon/[0.02] rounded-t-2xl' : ''} flex-shrink-0 flex flex-col gap-4 h-full snap-start transition-[width] duration-300`}
              >
                <div
                  className={`text-sm font-medium pb-2 border-b flex justify-between items-center ${isOverdue ? 'text-red-400 border-red-500/30' : isToday ? 'text-neon border-neon/50' : 'text-gray-400 border-glass-border'}`}
                >
                  <span>{colName}</span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-3 noir-scrollbar">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingTaskId(task.id)}
                      className={`p-3.5 rounded-xl noir-glass border border-white/5 hover:border-white/10 cursor-grab active:cursor-grabbing transition-all group relative flex flex-col gap-3 ${draggingTaskId === task.id ? 'opacity-30 scale-95' : 'opacity-100'}`}
                    >
                      <div
                        className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${getStatusColor(task.status)} opacity-50`}
                      />
                      {task.source === 'NOTION' && (
                        <a
                          href={`https://notion.so/${task.id.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2.5 right-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <div className="flex items-start gap-2.5 pr-10">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getStatusColor(task.status)}`}
                        />
                        <div className="text-sm font-medium leading-snug flex-1">
                          {task.title}
                          {task.source === 'LOCAL' && (
                            <HardDrive
                              className="w-3.5 h-3.5 inline-block ml-1.5 text-white/20 align-text-bottom"
                              title="Local Task"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto h-6">
                        <div className="flex flex-wrap gap-1.5">
                          {task.topics?.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => onTaskClick(task)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-[10px] font-medium uppercase px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={onOpenTaskModal}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-neon rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,243,0.5)] hover:scale-105 transition-transform z-40 border border-white/20"
      >
        <Plus className="w-8 h-8" />
      </button>
    </>
  );
}
