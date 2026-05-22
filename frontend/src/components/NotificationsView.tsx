// src/components/NotificationsView.tsx
'use client';
import { useEffect, useState } from 'react';
import { Bell, Clock, Info, AlertTriangle } from 'lucide-react';

interface Props {
  onRead: () => void;
}

export default function NotificationsView({ onRead }: Props) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // カテゴリに応じたアイコンを返す関数
  const getIcon = (category: string) => {
    if (category === 'ALERT')
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    return <Info className="w-4 h-4 text-neon" />;
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true); // 取得開始
      try {
        // 1. 通知リスト取得
        const res = await fetch('/api/v1/notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
          },
        });

        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

        const data = await res.json();
        setNotifications(data.notifications);

        // 2. 既読にするAPIを叩く
        await fetch('/api/v1/notifications/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
          },
        });
        onRead(); // 親の hasUnread を false にする
      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      } finally {
        setLoading(false); // 取得終了
      }
    };
    init();
  }, [onRead]);

  return (
    <div className="flex-1 px-4 pb-20 max-w-2xl mx-auto w-full space-y-6 overflow-y-auto noir-scrollbar">
      <section className="flex flex-col gap-4">
        <h2 className="noir-label px-1 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5" />
          Notification History
        </h2>

        <div className="space-y-3">
          {loading ? (
            /* ローディング中の表示（スケルトン風） */
            <div className="text-center py-10 text-gray-500 animate-pulse text-sm">
              Loading history...
            </div>
          ) : notifications.length === 0 ? (
            /* 通知が空の場合 */
            <div className="noir-glass p-10 rounded-2xl text-center text-gray-500 text-sm">
              No notifications yet.
            </div>
          ) : (
            /* 通知リストの表示 */
            notifications.map((n) => (
              <div
                key={n.id}
                className="noir-glass p-4 rounded-2xl flex gap-4 items-start border-t-white/5"
              >
                <div className="mt-1">{getIcon(n.category)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-200">
                    {n.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {n.content}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-3">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
