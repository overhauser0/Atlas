'use client';
import { useState } from 'react';
import { Task } from '@/types';
import { mergeNewDateWithOriginalTime } from '@/utils/dateUtils';
import { getStatusColor, sortTasksByStatus } from '@/utils/miscellaneousUtils';
import { atlasFetch } from '@/utils/api';
import MonthSelector from '@/components/ui/MonthSelector';
import FAB from '@/components/ui/FAB';

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
  tasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  openTaskModal: (task?: Partial<Task>) => void;
  onOpenStats: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({
  appSettings,
  setAppSettings,
  tasks,
  completedTasks,
  loading,
  setTasks,
  openTaskModal,
  onOpenStats,
}: Props) {
  const [targetDate, setTargetDate] = useState(new Date());
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // トグルの状態管理（設定に保存）
  const showCompleted = appSettings?.showCompletedInCalendar ?? false;

  // 表示するタスクの結合
  const displayTasks = showCompleted ? [...tasks, ...completedTasks] : tasks;

  // カレンダー計算ロジック
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // D&D処理
  const onDrop = async (newDateStr: string) => {
    if (!draggingTaskId) return;
    const task = displayTasks.find((t) => t.id === draggingTaskId);

    // 日付が変わらない場合は無視（時刻部分は維持するため、前方一致で簡易判定）
    if (!task || task.date?.startsWith(newDateStr)) {
      setDraggingTaskId(null);
      return;
    }

    const newDateTime = mergeNewDateWithOriginalTime(task.date, newDateStr);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, date: newDateTime } : t,
      ),
    );
    setDraggingTaskId(null);

    await atlasFetch(`/pieces/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...task,
        date: newDateTime,
        source: task.source,
      }),
    });
  };

  const handleRightClick = (e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    openTaskModal && openTaskModal({ date: dateStr } as Task);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-4 px-2">
        <MonthSelector currentDate={targetDate} onChange={setTargetDate} />
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-2 mb-2 px-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="flex-1 overflow-y-auto px-2 pb-24 noir-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full w-full text-gray-400 animate-pulse">
            Loading Calendar...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(100px,auto)]">
            {/* 前月の余白 */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-2 rounded-xl border border-transparent bg-white/2 opacity-50"
              />
            ))}

            {/* 当月の日付 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              // この日のタスクをフィルタリング (表示対象のタスク群から)
              const dayTasks = sortTasksByStatus(
                displayTasks.filter((t) => t.date?.startsWith(dateStr)),
              );
              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(dateStr)}
                  onContextMenu={(e) => handleRightClick(e, dateStr)}
                  className={`p-2 rounded-xl border ${isToday ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 noir-glass'} flex flex-col gap-1.5 transition-colors hover:border-white/10 min-h-25 overflow-hidden`}
                >
                  <div
                    className={`text-xs font-medium text-right ${isToday ? 'text-blue-400' : 'text-gray-400'}`}
                    title="Open Stats"
                    onClick={() => {
                      onOpenStats(new Date(dateStr));
                    }}
                  >
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-y-auto noir-scrollbar">
                    {dayTasks.map((task) => {
                      // 完了済みタスクかどうかの判定（opacityを下げたりドラッグ不可にするため）
                      const isCompleted = completedTasks.some(
                        (ct) => ct.id === task.id,
                      );

                      return (
                        <div
                          key={task.id}
                          draggable={!isCompleted}
                          onDragStart={() =>
                            !isCompleted && setDraggingTaskId(task.id)
                          }
                          onClick={() => openTaskModal(task)}
                          className={`text-[10px] leading-tight p-1 rounded transition-all truncate flex items-center justify-between gap-1 group 
                            ${isCompleted ? 'opacity-50 cursor-pointer hover:bg-white/5' : 'hover:bg-white/10 cursor-grab active:cursor-grabbing'} 
                            ${draggingTaskId === task.id ? 'opacity-30' : ''}`}
                          style={{
                            borderLeftColor: `var(--${task.status.toLowerCase()}-color, #888)`,
                          }}
                        >
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <div
                              className={`noir-dot ${getStatusColor(task.status)}`}
                            />
                            <span
                              className={`truncate overflow-hidden ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'}`}
                            >
                              {task.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FAB onClick={() => openTaskModal()} />
    </div>
  );
}
