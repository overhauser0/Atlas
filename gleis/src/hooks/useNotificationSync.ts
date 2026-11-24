// src/hooks/useNotificationSync.ts
import { useState, useCallback } from 'react';
import { atlasFetch } from '@atlas/shared/api';
import type { AppNotification } from '@/types';

export const useNotificationSync = (isAuthenticated: boolean) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    }
  }, [isAuthenticated]);

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
