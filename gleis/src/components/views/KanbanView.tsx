'use client';
import { useState } from 'react';
import { ExternalLink, HardDrive, Calendar, ListChecks } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import Card from '@/components/ui/Card';
import FAB from '@/components/ui/FAB';
import { getDateShortString } from '@/utils/dateUtils';
import { getStatusColor, getNotionLinkById } from '@/utils/miscellaneousUtils';
import { atlasFetch } from '@/utils/api';

// カンバンで表示するステータスに 'Done' を追加
const KANBAN_COLUMNS = ['INBOX', 'Waiting', 'Going', 'Done'] as const;

interface Props {
  tasks: Task[];
  subTaskMap: Record<string, { total: number; done: number }>;
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  openTaskModal: (task?: Partial<Task>) => void;
}

export default function KanbanView({
  tasks,
  subTaskMap,
  loading,
  setTasks,
  openTaskModal,
}: Props) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const onDrop = async (targetStatus: TaskStatus) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task || task.status === targetStatus) {
      setDraggingTaskId(null);
      return;
    }

    // クライアント側の状態を更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, status: targetStatus } : t,
      ),
    );
    setDraggingTaskId(null);

    // バックエンドの更新（ステータス変更を送信）
    await atlasFetch(`/pieces/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...task,
        status: targetStatus,
        source: task.source,
      }),
    });
  };

  return (
    <>
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 flex gap-5 pb-2 noir-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full w-full text-gray-400 animate-pulse">
            Loading Kanban...
          </div>
        ) : (
          KANBAN_COLUMNS.map((status) => {
            const isDoneColumn = status === 'Done';
            // Doneカラムの場合はタスク一覧を表示しないため、強制的に空配列にする
            const colTasks = isDoneColumn
              ? []
              : tasks
                  .filter((t) => t.status === status)
                  .sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return (
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                  });

            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(status)}
                className="w-80 md:w-[calc(25%-15px)] shrink-0 flex flex-col gap-4 h-full"
              >
                <div
                  className={`text-sm font-medium pb-2 border-b ${isDoneColumn ? 'border-green-500 text-green-500' : 'border-glass-border text-gray-400'} flex justify-between items-center`}
                >
                  <span>{status}</span>
                  {/* Doneカラムは件数を表示しない */}
                  {!isDoneColumn && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-3 noir-scrollbar relative">
                  {/* Doneカラム専用のドロップゾーン表示 */}
                  {isDoneColumn && (
                    <div
                      className={`absolute inset-x-0 inset-y-0 mr-2 mb-12 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-white/2 text-green-500`}
                    >
                      <span className="text-sm font-medium">
                        Drop to Complete
                      </span>
                    </div>
                  )}

                  {colTasks.map((task) => {
                    const countData = subTaskMap[task.id];
                    const isAllDone =
                      countData &&
                      countData.total > 0 &&
                      countData.done === countData.total;
                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingTaskId(task.id)}
                        className={`cursor-grab active:cursor-grabbing group flex flex-col gap-3 z-10 ${draggingTaskId === task.id ? 'opacity-30 scale-95' : ''}`}
                      >
                        {/* --- 1行目: ステータスドット + タイトル + Notionリンク --- */}
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
                              className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white"
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

                        {/* --- 2行目: 日付 + Detailボタン --- */}
                        <div className="flex items-center justify-between mt-auto h-6">
                          <div className="flex gap-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{getDateShortString(task.date)}</span>
                            </div>
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
                          </div>

                          <button
                            onClick={() => openTaskModal(task)}
                            className="shrink-0 text-[10px] font-medium uppercase px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                          >
                            Detail
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <FAB onClick={() => openTaskModal()} />
    </>
  );
}
