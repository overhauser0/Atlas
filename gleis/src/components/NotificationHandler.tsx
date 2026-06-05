// src/components/NotificationHandler.tsx
'use client';
import { useEffect, useCallback } from 'react';

interface Props {
  appSettings: any;
  onUpdateNotifications: (notifications: any[]) => void;
  onTaskUpdate: () => void;
}

export default function NotificationHandler({
  appSettings,
  onUpdateNotifications,
  onTaskUpdate,
}: Props) {
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });

      if (!res.ok) {
        console.warn(`Failed to fetch notifications: ${res.statusText}`);
        return;
      }

      const data = await res.json();

      if (!data.notifications) {
        console.warn('No notifications field in response');
        return;
      }

      // 1. 取得したデータをそのまま親（page.tsx）へ渡す
      onUpdateNotifications(data.notifications);

      // 2. タスク更新フラグがあればタスク再取得
      const hasTaskUpdate = data.notifications.some(
        (n: any) => n.is_task_update && !n.is_read,
      );
      if (hasTaskUpdate) onTaskUpdate();
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    }
  }, [onUpdateNotifications, onTaskUpdate]);

  useEffect(() => {
    const sec = appSettings?.notificationInterval || 30;
    if (sec <= 0) return;
    const timer = setInterval(fetchNotifications, sec * 1000);
    fetchNotifications(); // 初回
    return () => clearInterval(timer);
  }, [fetchNotifications, appSettings?.notificationInterval]);

  return null;
}
