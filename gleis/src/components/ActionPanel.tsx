'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  X,
  ChevronRight,
  Sun,
  Moon,
  RefreshCw,
  QrCode,
  Mic,
  Zap,
  AlertTriangle,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isWakeLockActive: boolean;
  onNavigateToNotifications: () => void;
  notifications: any[];
  onOpenVoiceCapture: () => void;
  lastSyncTime: number | null | undefined;
  overdueTasks?: any[];
  onRescheduleOverdue?: () => Promise<void>;
  onSyncStart: () => void;
  onSyncEnd: () => void;
  onNotionSync: () => void;
}

export default function ActionPanel({
  isOpen,
  onClose,
  isWakeLockActive,
  onNavigateToNotifications,
  notifications = [],
  onOpenVoiceCapture,
  lastSyncTime,
  overdueTasks = [],
  onRescheduleOverdue,
  onSyncStart,
  onSyncEnd,
  onNotionSync,
}: Props) {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { addToast } = useToast();

  // 未読の通知を新しい順にソートし、最大2件まで抽出
  const recentUnreadNotifications = useMemo(() => {
    return [...notifications]
      .filter((n) => !n.is_read) // 未読のみ
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ) // 新しい順
      .slice(0, 2); // 最大2件
  }, [notifications]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escキーでモーダルを閉じる関数
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 期限切れタスクを一括更新するハンドラー
  const handleRescheduleClick = async () => {
    if (!onRescheduleOverdue) return;

    onSyncStart();
    onClose();

    try {
      await onRescheduleOverdue();
      addToast(
        `${overdueTasks.length} Overdue tasks have been moved to today.`,
        'info',
      );
    } catch (error) {
      console.error('Failed to reschedule:', error);
      addToast('タスクの移動に失敗しました', 'info');
    } finally {
      onSyncEnd();
    }
  };

  const handleNotionSync = async () => {
    onNotionSync();
    onClose();
  };

  // 最終同期日時のフォーマット関数
  const formatSyncTime = (dateStr?: number | null | undefined) => {
    if (!dateStr) return 'Never synced';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo',
    });
  };

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* バックドロップ */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-400 pointer-events-auto ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* パネル本体（ダークガラス） */}
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-sm bg-zinc-950/90 backdrop-blur-2xl shadow-2xl border-l border-white/10 flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-primary-500 fill-primary-500" />
            <h2 className="text-xl font-black tracking-tight">
              Control Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 transition-colors border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 no-scrollbar">
          {/* システムステータス */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-4 rounded-2xl border flex flex-col gap-2 transition-colors ${
                isWakeLockActive
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isWakeLockActive
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/5 text-zinc-500'
                }`}
              >
                {isWakeLockActive ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500">Wake Lock</p>
                <p
                  className={`text-sm font-bold ${isWakeLockActive ? 'text-amber-400' : 'text-zinc-300'}`}
                >
                  {isWakeLockActive ? 'Active' : 'Standby'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-2">
              <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500">Database</p>
                <p className="text-sm font-bold text-zinc-300">Synced</p>
              </div>
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Latest Update
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {/* 同期ステータス＆期限切れタスクのカード */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div
                  onClick={handleNotionSync}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-300">
                      Notion Sync
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-500">
                    {formatSyncTime(lastSyncTime)}
                  </span>
                </div>

                {/* 期限切れタスクがある場合のみ表示されるセクション */}
                {overdueTasks.length > 0 && (
                  <>
                    <div className="h-px w-full bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-bold">
                          {overdueTasks.length} Overdue Tasks
                        </span>
                      </div>
                      <button
                        onClick={handleRescheduleClick}
                        className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <CalendarDays className="w-3 h-3" />
                        <span>Move to Today</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 通知リストのカード */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-4">
                {recentUnreadNotifications.length > 0 ? (
                  <div className="flex flex-col gap-5">
                    {recentUnreadNotifications.map((n) => {
                      const isAlert = n.category === 'ALERT';

                      return (
                        <div
                          key={n.id}
                          className="relative flex gap-4 items-start group"
                        >
                          {/* 左側のアクセントライン */}
                          <div
                            className={`absolute -left-5 top-0 w-1 h-full rounded-r-md ${isAlert ? 'bg-red-500' : 'bg-blue-500'}`}
                          />

                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                              isAlert
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {isAlert ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : (
                              <Bell className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-zinc-100 mb-1 truncate">
                              {n.title}
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                              {n.content}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 mt-2">
                              <Clock className="w-3 h-3" />
                              {new Date(n.created_at).toLocaleString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 未読通知がない場合の表示 */
                  <div className="py-4 flex flex-col items-center justify-center text-zinc-500">
                    <Bell className="w-6 h-6 mb-2 opacity-20" />
                    <p className="text-xs font-bold">You're all caught up!</p>
                  </div>
                )}

                {/* 区切り線 */}
                {recentUnreadNotifications.length > 0 && (
                  <div className="h-px w-full bg-white/5" />
                )}

                {/* 全画面表示への遷移ボタン */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToNotifications();
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors active:scale-95"
                >
                  View all notifications <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </section>

          {/* クイックアクション */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">
              Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-white/10 text-zinc-300 rounded-full flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-300">Scan QR</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenVoiceCapture();
                }}
                className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 bg-white/10 text-zinc-300 rounded-full flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-300">
                  Voice Note
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
