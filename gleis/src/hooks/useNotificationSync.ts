// src/hooks/useNotificationSync.ts
import { useState, useCallback, useEffect } from 'react';
import { atlasFetch } from '@/utils/api';

export const useNotificationSync = (
  isAuthenticated: boolean,
  onTaskUpdate: () => void,
) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  // 1. 通知の取得処理
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await atlasFetch('/notifications', { method: 'GET' });

      if (!res.ok) {
        console.warn(`Failed to fetch notifications: ${res.statusText}`);
        return;
      }

      const data = await res.json();

      if (!data.notifications) {
        console.warn('No notifications field in response');
        return;
      }

      setNotifications(data.notifications);

      // タスク更新フラグがあれば、親から渡されたコールバック（fetchTasks等）を発火
      const hasTaskUpdate = data.notifications.some(
        (n: any) => n.is_task_update && !n.is_read,
      );
      if (hasTaskUpdate) {
        onTaskUpdate();
      }
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    }
  }, [isAuthenticated, onTaskUpdate]);

  // 2. 既読処理（page.tsxから移動してカプセル化）
  const markAsRead = useCallback(async (id: string) => {
    // 楽観的UI更新：サーバーの応答を待たずに画面上ですぐ消す（サクサク感）
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await atlasFetch(`/notifications/${id}/read`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  }, []);

  return {
    notifications,
    setNotifications,
    fetchNotifications,
    markAsRead,
  };
};
