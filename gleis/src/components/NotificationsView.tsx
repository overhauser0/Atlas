// src/components/NotificationsView.tsx
'use client';
import {
  Bell,
  Clock,
  Info,
  AlertTriangle,
  Check,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Task } from '@/types';

interface Props {
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  openTaskModal: (task?: Partial<Task>) => void;
}

export default function NotificationsView({
  notifications,
  onMarkAsRead,
  openTaskModal,
}: Props) {
  const getIcon = (category: string) => {
    if (category === 'ALERT')
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    return <Info className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <>
      <div className="flex-1 px-4 pb-20 mx-auto w-full space-y-6 overflow-y-auto noir-scrollbar">
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-2 mt-4">
            <Bell className="w-3.5 h-3.5" />
            Notification History
          </h2>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-white/5 border border-white/5 p-10 rounded-3xl text-center text-zinc-500 text-sm font-medium">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`relative p-5 rounded-3xl flex gap-4 items-center transition-all duration-300 ${
                    n.is_read
                      ? 'bg-white/5 border border-white/5 opacity-70'
                      : 'bg-white/10 border border-white/10 shadow-lg'
                  }`}
                >
                  {!n.is_read && <div className="noir-dot" />}

                  <div className="mt-0.5 ml-2">{getIcon(n.category)}</div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-bold truncate pr-4 ${n.is_read ? 'text-zinc-400' : 'text-zinc-100'}`}
                    >
                      {n.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      {n.note}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 mt-3">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleString('ja-JP')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {!n.is_read && (
                      <button
                        onClick={() => onMarkAsRead(n.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 border border-white/5 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {n.url && n.url.startsWith('http') && (
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="noir-icon-btn"
                        title="リンクを開く"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => openTaskModal({ title: n.title })}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 border border-white/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
