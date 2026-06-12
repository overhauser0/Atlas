'use client';
import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '@/types';
import { mergeNewDateWithOriginalTime } from '@/utils/dateUtils';
import { getStatusColor } from '@/utils/miscellaneousUtils';
import { atlasFetch } from '@/utils/api';

interface Props {
  tasks: Task[];
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onOpenTaskModal: () => void;
  onTaskClick: (task: Task) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({
  tasks,
  loading,
  setTasks,
  onOpenTaskModal,
  onTaskClick,
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // カレンダー計算ロジック
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // 月の移動
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // D&D処理
  const onDrop = async (newDateStr: string) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold text-gray-400 tracking-wide">
          {currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
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

              // この日のタスクをフィルタリング（未完了のみ、など条件があれば調整）
              const dayTasks = tasks.filter((t) => t.date?.startsWith(dateStr));
              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(dateStr)}
                  className={`p-2 rounded-xl border ${isToday ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 noir-glass'} flex flex-col gap-1.5 transition-colors hover:border-white/10 min-h-[100px] overflow-hidden`}
                >
                  <div
                    className={`text-xs font-medium text-right ${isToday ? 'text-blue-400' : 'text-gray-400'}`}
                  >
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-y-auto noir-scrollbar">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingTaskId(task.id)}
                        onClick={() => onTaskClick(task)}
                        className={`text-[10px] leading-tight p-1 rounded hover:bg-white/10 cursor-pointer transition-all truncate flex items-center justify-between gap-1 group ${draggingTaskId === task.id ? 'opacity-30' : ''}`}
                        style={{
                          borderLeftColor: `var(--${task.status.toLowerCase()}-color, #888)`,
                        }}
                      >
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <div
                            className={`noir-dot ${getStatusColor(task.status)}`}
                          />
                          <span className="truncate text-gray-200 overflow-hidden">
                            {task.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={onOpenTaskModal}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-neon rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,243,0.5)] hover:scale-105 transition-transform z-40 border border-white/20"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
