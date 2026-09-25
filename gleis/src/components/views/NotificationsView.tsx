'use client';
import { useState } from 'react';
import {
  Bell,
  Clock,
  Info,
  AlertTriangle,
  Check,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Task } from '@/types';

interface Props {
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  openTaskModal: (task?: Partial<Task>) => void;
  handleGleisLink: (url: string, callback?: Function) => void;
}

export default function NotificationsView({
  notifications,
  onMarkAsRead,
  openTaskModal,
  handleGleisLink,
}: Props) {
  // 詳細アコーディオン用状態
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getIcon = (category: string) => {
    if (category === 'ALERT')
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    return <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  // 日時表示を短縮化 (例: 09/05 14:30)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  };

  return (
    <div className="flex-1 px-3 pb-20 mx-auto w-full space-y-4 overflow-y-auto noir-scrollbar">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1 mt-2">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            Notifications ({notifications.length})
          </h2>
        </div>

        <div className="space-y-1">
          {notifications.length === 0 ? (
            <div className="bg-white/5 border border-white/5 p-8 rounded-xl text-center text-zinc-500 text-xs font-medium">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => {
              const isExpanded = !!expandedIds[n.id];
              return (
                <div
                  key={n.id}
                  className={`group relative rounded-xl border transition-all duration-200 overflow-hidden ${
                    n.is_read
                      ? 'bg-white/2 border-white/5 text-zinc-400'
                      : 'bg-white/[0.07] border-white/10 shadow-sm text-zinc-100'
                  }`}
                >
                  {/* メイン行 (コンパクト1行表示) */}
                  <div
                    onClick={() => n.note && toggleExpand(n.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs ${
                      n.note ? 'cursor-pointer hover:bg-white/5' : ''
                    }`}
                  >
                    {/* 未読ドット */}
                    {!n.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                    )}

                    {/* カテゴリアイコン */}
                    <div>{getIcon(n.category)}</div>

                    {/* タイトル & ノート抜粋 */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span
                        className={`font-semibold truncate ${
                          n.is_read ? 'text-zinc-400' : 'text-zinc-200'
                        }`}
                      >
                        {n.title}
                      </span>
                      {n.note && !isExpanded && (
                        <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">
                          — {n.note}
                        </span>
                      )}
                    </div>

                    {/* 日時 (短縮化) */}
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 shrink-0 ml-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(n.created_at)}
                    </div>

                    {/* アクションボタン群 */}
                    <div
                      className="flex items-center gap-1 shrink-0 ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!n.is_read && (
                        <button
                          onClick={() => onMarkAsRead(n.id)}
                          className="p-1 rounded-md bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors"
                          title="既読にする"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {n.url && (
                        <button
                          type="button"
                          onClick={() => handleGleisLink(n.url)}
                          className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="リンクを開く"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          openTaskModal({
                            title: n.title,
                            note: n.note ?? '',
                            url: n.url ?? '',
                          })
                        }
                        className="p-1 rounded-md bg-white/5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 transition-colors"
                        title="タスク化"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* 詳細トグル（ノートがある場合のみ） */}
                      {n.note && (
                        <button
                          onClick={() => toggleExpand(n.id)}
                          className="p-1 text-zinc-500 hover:text-zinc-300"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 詳細表示エリア（アコーディオン展開時） */}
                  {isExpanded && n.note && (
                    <div className="px-3 pb-2.5 pt-1 text-xs text-zinc-400 border-t border-white/5 bg-black/20 leading-relaxed whitespace-pre-wrap pl-8">
                      {n.note}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
