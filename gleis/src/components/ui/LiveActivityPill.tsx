'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Video,
  Clock,
  X,
} from 'lucide-react';
import { triggerHaptics } from '@/utils/haptics';

export interface LiveActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  targetTime: Date | number; // 目的の時刻（MTGの開始時刻など）
  actionUrl?: string; // MeetやNotionなどのリンクURL
  actionLabel?: string; // ボタンのテキスト（デフォルト: "Join"）
}

interface Props {
  activity: LiveActivityItem | null;
  onClose?: () => void;
  onOpenLink: (url: string) => void;
}

export default function LiveActivityPill({
  activity,
  onClose,
  onOpenLink,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  // 1秒ごとに現在時刻を更新
  useEffect(() => {
    if (!activity) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [activity]);

  // 残り時間の計算 (ミリ秒)
  const targetTimestamp = useMemo(() => {
    if (!activity) return 0;
    return typeof activity.targetTime === 'number'
      ? activity.targetTime
      : activity.targetTime.getTime();
  }, [activity]);

  const diffMs = targetTimestamp - now;
  const isOverdue = diffMs <= 0;

  // カウントダウン文字列の生成 (MM:SS または HH:MM:SS)
  const formattedCountdown = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [diffMs]);

  // 時間が 00:00 になった瞬間に振動でフィードバック
  useEffect(() => {
    if (isOverdue && Math.abs(diffMs) < 1000) {
      triggerHaptics(10);
    }
  }, [isOverdue, diffMs]);

  if (!activity) return null;

  // トグル処理
  const handleToggleExpand = () => {
    triggerHaptics(8);
    setIsExpanded((prev) => !prev);
  };

  // アクションリンクを開く処理
  const handleOpenAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activity.actionUrl) return;

    triggerHaptics(12);

    onOpenLink(activity.actionUrl);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-5">
      {/* 展開時の詳細カード */}
      {isExpanded && (
        <div className="noir-glass w-72 mb-2 p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Upcoming Event
              </span>
              <h4 className="text-sm font-bold text-white truncate">
                {activity.title}
              </h4>
              {activity.subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {activity.subtitle}
                </p>
              )}
            </div>
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptics(8);
                  onClose();
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* クイックアクションボタン */}
          {activity.actionUrl && (
            <button
              onClick={handleOpenAction}
              className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {activity.actionUrl.includes('meet') ||
              activity.actionUrl.includes('zoom') ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              <span>{activity.actionLabel || 'Open Link'}</span>
            </button>
          )}
        </div>
      )}

      {/* 常駐するボトムピル本体 */}
      <div
        onClick={handleToggleExpand}
        className="noir-glass cursor-pointer flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl hover:border-white/20 transition-all active:scale-98 select-none"
      >
        {/* ステータスインジケーター (点滅ドット) */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOverdue ? 'bg-red-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOverdue ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
        </span>

        {/* カウントダウン & タイトル */}
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 min-w-0">
          <span
            className={`font-mono text-xs ${
              isOverdue ? 'text-red-400 animate-pulse' : 'text-amber-400'
            }`}
          >
            {isOverdue ? `+${formattedCountdown}` : formattedCountdown}
          </span>
          <span className="text-zinc-600 shrink-0">|</span>
          <span className="truncate max-w-35 sm:max-w-50">
            {activity.title}
          </span>
        </div>

        {/* トグルアイコン */}
        <div className="text-zinc-400 group-hover:text-white transition-colors shrink-0 ml-1">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
}
