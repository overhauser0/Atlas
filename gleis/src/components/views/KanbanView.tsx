'use client';
import { useState } from 'react';
import { ExternalLink, HardDrive, Calendar } from 'lucide-react';
import { SubTaskProgressMap, Task, TaskStatus } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { getDateShortString } from '@atlas/shared/date';
import {
  getNotionLinkById,
  getStatusColor,
  sortByStartDate,
} from '@/utils/task';
import Card from '@/components/ui/Card';
import FAB from '@/components/ui/FAB';
import { IconButton } from '@/components/ui/IconButton';
import TaskBadges from '@/components/ui/TaskBadges';
import { useToast } from '@/components/ui/Toast';

// カンバンで表示するステータスに 'Done' を追加
const KANBAN_COLUMNS = ['INBOX', 'Waiting', 'Going', 'Done'] as const;

interface Props {
  tasks: Task[];
  subTaskMap: SubTaskProgressMap;
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  openTaskModal: (task?: Partial<Task>) => void;
  onSyncStart: () => void;
  onSyncEnd: () => void;
}

export default function KanbanView({
  tasks,
  subTaskMap,
  loading,
  setTasks,
  openTaskModal,
  onSyncStart,
  onSyncEnd,
}: Props) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const { addToast } = useToast();

  const onDrop = async (targetStatus: TaskStatus) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task || task.status === targetStatus) {
      setDraggingTaskId(null);
      return;
    }

    const previousTask = task;

    // クライアント側の状態を楽観的に更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, status: targetStatus } : t,
      ),
    );
    setDraggingTaskId(null);

    // バックエンドの更新（ステータス変更のみ送信）
    onSyncStart();
    try {
      const res = await atlasFetch(`/pieces/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          source: task.source,
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update status (${res.status})`);
      }
    } catch (err) {
      console.warn('Kanban status update failed:', err);
      setTasks((prev) =>
        prev.map((t) => (t.id === previousTask.id ? previousTask : t)),
      );
      addToast('ステータスの更新に失敗しました', 'alert');
    } finally {
      onSyncEnd();
    }
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
              : sortByStartDate(tasks.filter((t) => t.status === status));

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
                            <IconButton
                              icon={<ExternalLink />}
                              href={getNotionLinkById(task.id, 'notion')}
                              target="_self"
                              iconClassName="w-4 h-4"
                            />
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
                          <div className="flex gap-1.5 overflow-hidden">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{getDateShortString(task.start_date)}</span>
                            </div>
                            <TaskBadges
                              hasParent={Boolean(task.parent_id)}
                              subTaskProgress={countData}
                            />
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
