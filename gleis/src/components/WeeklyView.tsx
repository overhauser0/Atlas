'use client';
import { useState, useMemo } from 'react';
import { Plus, ExternalLink, HardDrive } from 'lucide-react';
import { Task } from '@/types';
import {
  mergeNewDateWithOriginalTime,
  isOverdue,
  getThisWeekMonday,
} from '@/utils/dateUtils';
import {
  COLUMNS,
  getStatusColor,
  sortTasksByStatus,
  getNotionLinkById,
} from '@/utils/miscellaneousUtils';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/Toast';

interface Props {
  appSettings: { shrinkEmptyPastDays: boolean };
  tasks: Task[];
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onCreateTask: () => void;
  onTaskClick: (task: Task) => void;
  onOpenStats: (date: Date) => void;
  onSyncStart: () => void;
  onSyncEnd: () => void;
}

export default function WeeklyView({
  appSettings,
  tasks,
  loading,
  setTasks,
  onCreateTask,
  onTaskClick,
  onOpenStats,
  onSyncStart,
  onSyncEnd,
}: Props) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const { addToast } = useToast();

  const onDrop = async (newDateStr: string | null) => {
    if (!draggingTaskId || newDateStr === null) {
      setDraggingTaskId(null);
      return;
    }
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task) return;

    const newDateTime = mergeNewDateWithOriginalTime(task.date, newDateStr);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, date: newDateTime } : t,
      ),
    );
    setDraggingTaskId(null);

    onSyncStart();
    try {
      await atlasFetch(`/pieces/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...task,
          date: newDateTime,
          source: task.source,
        }),
      });
    } catch (err) {
      console.warn('Fetch Error', err);
      addToast('タスクの保存に失敗しました', 'alert');
    } finally {
      onSyncEnd();
    }
  };

  const weekColumns = useMemo(() => {
    const now = new Date();

    // 今日の日付文字列（YYYY-MM-DD）をJSTで取得
    const todayStr = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tokyo',
    })
      .format(now)
      .replace(/\//g, '-');

    // 今週の「月曜日」を取得（週の開始を月曜とする）
    const startOfWeek = getThisWeekMonday(now);

    // 月曜を起点(0)とした各曜日のオフセット日数
    const dayOffsets: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };

    return COLUMNS.map((colName) => {
      if (colName === 'Overdue') {
        return {
          name: colName,
          date: null,
          dateStr: null,
          isToday: false,
          isOverdue: true,
        };
      }

      const colDate = new Date(startOfWeek);
      // カラムの曜日に合わせて月曜からの日数を足す
      colDate.setDate(startOfWeek.getDate() + dayOffsets[colName]);

      const dateStr = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Tokyo',
      })
        .format(colDate)
        .replace(/\//g, '-');

      return {
        name: colName,
        date: colDate,
        dateStr: dateStr,
        isToday: dateStr === todayStr,
        isOverdue: false,
      };
    });
  }, []);

  return (
    <>
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 snap-x snap-mandatory flex gap-5 pb-2 noir-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full w-full text-gray-400 animate-pulse">
            Loading Tasks...
          </div>
        ) : (
          weekColumns.map((col) => {
            // 1. 完了を除外 & 期限切れをピックアップ
            const filteredTasks = tasks.filter((t) => {
              if (t.status === 'Done') return false;
              if (col.isOverdue) return isOverdue(t.date);

              return t.date && t.date.startsWith(col.dateStr!);
            });

            // 2. ステータス順でソート
            const colTasks = sortTasksByStatus(filteredTasks);

            const todayIndex = weekColumns.findIndex((c) => c.isToday);
            const colIndex = weekColumns.indexOf(col);
            const shouldShrink =
              appSettings.shrinkEmptyPastDays &&
              todayIndex !== -1 &&
              colIndex <= todayIndex &&
              colTasks.length === 0;

            return (
              <div
                key={col.name}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col.dateStr)}
                className={`${shouldShrink ? 'w-28' : 'w-70'} ${col.isToday ? 'bg-neon/2 rounded-t-2xl' : ''} shrink-0 flex flex-col gap-4 h-full snap-start transition-[width] duration-300`}
              >
                <div
                  className={`text-sm font-medium pb-2 border-b flex justify-between items-center transition-all ${
                    col.isOverdue
                      ? 'text-red-400 border-red-500/30 cursor-default'
                      : `cursor-pointer hover:opacity-70 ${col.isToday ? 'text-neon border-neon/50 hover:drop-shadow-[0_0_8px_rgba(0,112,243,0.5)]' : 'text-gray-400 border-glass-border hover:text-gray-200'}`
                  }`}
                  title={
                    col.isOverdue
                      ? undefined
                      : `${col.name}のパフォーマンスを見る`
                  }
                  onClick={() => {
                    if (col.isOverdue || !col.date) return;
                    onOpenStats(col.date);
                  }}
                >
                  <span>{col.name}</span>
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
                        className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${getStatusColor(task.status)} opacity-50`}
                      />
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center shrink-0">
                          <span
                            className={`noir-dot ${getStatusColor(task.status)}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug truncate">
                            {task.title}
                          </p>
                        </div>
                        {task.source === 'NOTION' && (
                          <a
                            href={getNotionLinkById(task.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {task.source === 'LOCAL' && (
                          <span
                            className="rounded-lg text-gray-500 p-1.5 shrink-0"
                            title="Local Task"
                          >
                            <HardDrive className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-auto h-6">
                        <div className="flex flex-wrap gap-1.5">
                          {task.topics?.map((t: any) => (
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
                          className="text-[10px] font-medium uppercase px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
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
        onClick={onCreateTask}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-neon rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,243,0.5)] hover:scale-105 transition-transform z-40 border border-white/20"
      >
        <Plus className="w-8 h-8" />
      </button>
    </>
  );
}
