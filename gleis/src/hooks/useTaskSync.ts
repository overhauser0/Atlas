// gleis/src/hooks/useTaskSync.ts
import { useState, useCallback } from 'react';
import { Task } from '@/types';
import type { TaskSavePayload } from '@/components/modals/TaskModal';
import { isPastDate } from '@atlas/shared/date';
import { getPieceDateRangeUpdate, sortByStartDate } from '@/utils/task';
import { atlasFetch } from '@atlas/shared/api';
import { fetchPieceBlocks, type NotionBlock } from '@atlas/shared/notion';

export const useTaskSync = (
  isAuthenticated: boolean,
  onSyncStart: () => void,
  onSyncEnd: () => void,
  syncInterval: number,
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [wrapperTasks, setWrapperTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [meetingTasks, setMeetingTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const fetchLastSyncTime = useCallback(async () => {
    try {
      const res = await atlasFetch('/pieces/sync', {
        method: 'GET',
      });
      if (!res.ok) return null;
      const syncInfo = await res.json();
      const time = new Date(syncInfo.lastSyncTime).getTime();
      setLastSyncTime(time);
      return time;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }, []);

  const fetchTasks = useCallback(
    async (isSilent = false) => {
      if (!isAuthenticated) return;
      if (!isSilent) setIsTasksLoading(true);

      // onSyncStart();

      try {
        await fetchLastSyncTime();
        const res = await atlasFetch(
          '/pieces?area=Work&excludeStatus=Canceled',
          { method: 'GET' },
        );

        if (!res.ok) return;

        const data = await res.json();
        const statuses = ['INBOX', 'Waiting', 'Going'];

        setTasks(
          data.pieces.filter((t: Task) =>
            t.source === 'LOCAL'
              ? t.status !== 'Done'
              : t.area === 'Work' && statuses.includes(t.status || ''),
          ),
        );
        setCompletedTasks(data.pieces.filter((t: Task) => t.status === 'Done'));
        setWrapperTasks(
          data.pieces.filter((t: Task) => t.status === 'Wrapper'),
        );
        setOverdueTasks(
          data.pieces.filter(
            (t: Task) =>
              isPastDate(t.start_date) &&
              t.status !== 'Done' &&
              t.status !== 'Canceled',
          ),
        );
        setMeetingTasks(
          sortByStartDate(
            data.pieces.filter((t: Task) => {
              const topics = t.topics || [];
              return topics.includes('Meeting');
            }),
            'desc',
          ),
        );
      } finally {
        setIsTasksLoading(false);
        // onSyncEnd();
      }
    },
    [isAuthenticated, fetchLastSyncTime],
  );

  const handleNotionSync = useCallback(
    async (force = false) => {
      onSyncStart();
      try {
        const last = (await fetchLastSyncTime()) || 0;
        if (force || new Date().getTime() - last >= syncInterval * 60 * 1000) {
          await atlasFetch('/pieces/sync', {
            method: 'POST',
          });
        }
      } catch (e) {
        console.warn(e);
      } finally {
        onSyncEnd();
      }
    },
    [fetchTasks, onSyncStart, onSyncEnd, syncInterval],
  );

  const handleRescheduleOverdue = useCallback(async () => {
    onSyncStart();
    try {
      await atlasFetch('/pieces/reschedule-overdue', {
        method: 'POST',
      });
      // 完了後にタスク一覧を再取得 → WebSocketに
      // await fetchTasks(true);
    } catch (e) {
      console.warn(e);
      throw e;
    } finally {
      onSyncEnd();
    }
  }, [fetchTasks, onSyncStart, onSyncEnd]);

  // タスクを保存する共通関数
  const saveTask = async (
    taskId: string | null,
    payload: TaskSavePayload | Partial<Task>,
  ) => {
    const url = taskId ? `/pieces/${taskId}` : '/pieces';
    const method = taskId ? 'PATCH' : 'POST';

    const response = await atlasFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);

    return response;
  };

  // 親タスクの期日だけを更新する関数
  const updateTaskDate = async (task: Task, newDate: string) => {
    const dateUpdates = getPieceDateRangeUpdate(
      task.start_date,
      task.end_date,
      newDate,
    );
    const response = await atlasFetch(`/pieces/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify(dateUpdates),
    });
    if (!response.ok) throw new Error('Failed to update parent date');
  };

  const fetchBlocks = useCallback(
    async (id: string, depth = 1): Promise<NotionBlock[]> => {
      if (!id) return [];
      onSyncStart();
      try {
        return await fetchPieceBlocks(id, { depth });
      } catch (e) {
        console.warn(e);
        throw e;
      } finally {
        onSyncEnd();
      }
    },
    [],
  );

  return {
    tasks,
    setTasks,
    completedTasks,
    wrapperTasks,
    overdueTasks,
    meetingTasks,
    isTasksLoading,
    lastSyncTime,
    fetchTasks,
    handleNotionSync,
    handleRescheduleOverdue,
    saveTask,
    updateTaskDate,
    fetchBlocks,
  };
};
