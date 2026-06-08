// gleis/src/hooks/useTaskSync.ts
import { useState, useCallback } from 'react';
import { Task } from '@/types';
import { isPastDate } from '@/utils/dateUtils';

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
      const res = await fetch('/api/v1/pieces/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
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
        const res = await fetch(
          '/api/v1/pieces?area=Work&excludeStatus=Canceled',
          {
            method: 'GET',
            headers: { 'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '' },
          },
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
          await fetch('/api/v1/pieces/sync', {
            method: 'POST',
            headers: { 'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '' },
          });
        }
        await fetchTasks(true);
      } finally {
        onSyncEnd();
      }
    },
    [fetchTasks, onSyncStart, onSyncEnd, syncInterval],
  );

  const handleRescheduleOverdue = useCallback(async () => {
    onSyncStart();
    try {
      await fetch('/api/v1/pieces/reschedule-overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });
      // 完了後にタスク一覧を再取得
      await fetchTasks(true);
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
