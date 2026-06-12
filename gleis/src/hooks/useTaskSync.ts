// gleis/src/hooks/useTaskSync.ts
import { useState, useCallback } from 'react';
import { Task } from '@/types';
import { isPastDate } from '@/utils/dateUtils';
import { atlasFetch } from '@/utils/api';

export const useTaskSync = (
  isAuthenticated: boolean,
  onSyncStart: () => void,
  onSyncEnd: () => void,
  syncInterval: number,
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
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
        setOverdueTasks(
          data.pieces.filter(
            (t: Task) =>
              isPastDate(t.date) &&
              t.status !== 'Done' &&
              t.status !== 'Canceled',
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
        // await fetchTasks(true); → WebSocketに
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

  return {
    tasks,
    setTasks,
    completedTasks,
    overdueTasks,
    isTasksLoading,
    lastSyncTime,
    fetchTasks,
    handleNotionSync,
    handleRescheduleOverdue,
  };
};
