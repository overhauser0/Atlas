"use client";
import { useEffect, useCallback } from "react";
import { useToast } from "./Toast";

export default function NotificationHandler() {
  const { addToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      // 💡 バックエンドに新着通知を取りに行く
      const res = await fetch("/api/notifications/poll");
      const data = await res.json();

      if (data.success && data.notifications.length > 0) {
        data.notifications.forEach((n: any) => {
          // トーストを表示
          addToast(n.title, n.isAlert ? "alert" : "info");

          // 💡 もしタスクとして追加された通知なら、
          // ページをリロードせずにタスク一覧を更新させるために
          // windowイベントを発火させる等の工夫ができます
          if (n.isTask) {
            window.dispatchEvent(new Event("task-updated"));
          }
        });
      }
    } catch (e) {
      console.error("Notification poll error:", e);
    }
  }, [addToast]);

  useEffect(() => {
    // 30秒ごとに新着通知がないか確認（バックエンドの負荷を考慮）
    const timer = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  return null;
}
