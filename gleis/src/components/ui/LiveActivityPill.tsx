'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Video,
  Clock,
  X,
  Loader2,
  Flame,
  Sun,
  WifiOff,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import { triggerHaptics } from '@/lib/haptics';

export type LiveActivityTone = 'neon' | 'amber' | 'red' | 'emerald';

export type LiveActivityKind =
  | 'focus'
  | 'processing'
  | 'alert'
  | 'wakelock'
  | 'countdown';

export interface LiveActivityAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: 'play' | 'pause' | 'maximize' | 'refresh';
}

export interface LiveActivityItem {
  id: string;
  kind: LiveActivityKind;
  tone: LiveActivityTone;
  badge?: string;
  title: string;
  subtitle?: string;
  isPulsing?: boolean;
  isSpinner?: boolean;
  targetTime?: Date | number;
  /** 設定されている場合、ピル本体タップで展開せず即座にアクションを実行する */
  directAction?: () => void;
  /** ピル右端に出すミニクイックボタン（FocusのPlay/Pauseなど） */
  inlineAction?: {
    ariaLabel: string;
    icon: 'play' | 'pause';
    onClick: () => void;
  };
  primaryAction?: LiveActivityAction;
  secondaryAction?: LiveActivityAction;
  actionUrl?: string;
  actionLabel?: string;
  onDismiss?: () => void;
}

interface Props {
  activities: LiveActivityItem[];
  onOpenLink: (url: string) => void;
}

const TONE_STYLES: Record<
  LiveActivityTone,
  {
    ping: string;
    dot: string;
    text: string;
    border: string;
    primaryBtn: string;
  }
> = {
  neon: {
    ping: 'bg-neon',
    dot: 'bg-neon',
    text: 'text-neon',
    border: 'border-neon/30',
    primaryBtn:
      'bg-neon/20 hover:bg-neon/30 border-neon/40 text-blue-200',
  },
  amber: {
    ping: 'bg-amber-400',
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    primaryBtn:
      'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-300',
  },
  red: {
    ping: 'bg-red-400',
    dot: 'bg-red-500',
    text: 'text-red-400',
    border: 'border-red-500/30',
    primaryBtn:
      'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-300',
  },
  emerald: {
    ping: 'bg-emerald-400',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    primaryBtn:
      'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-300',
  },
};

function renderKindIcon(kind: LiveActivityKind, className: string) {
  switch (kind) {
    case 'focus':
      return <Flame className={className} />;
    case 'wakelock':
      return <Sun className={className} />;
    case 'alert':
      return <WifiOff className={className} />;
    case 'processing':
      return <Loader2 className={`${className} animate-spin`} />;
    case 'countdown':
    default:
      return <Clock className={className} />;
  }
}

function renderActionIcon(icon?: LiveActivityAction['icon']) {
  switch (icon) {
    case 'play':
      return <Play className="w-3.5 h-3.5 fill-current" />;
    case 'pause':
      return <Pause className="w-3.5 h-3.5 fill-current" />;
    case 'maximize':
      return <Maximize2 className="w-3.5 h-3.5" />;
    case 'refresh':
      return <RefreshCw className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

export default function LiveActivityPill({ activities, onOpenLink }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // 現在表示するアクティビティを決定（ユーザーが選んだIDがまだ存在すれば優先、なければ先頭）
  const activeIndex = useMemo(() => {
    if (activities.length === 0) return -1;
    if (selectedId) {
      const found = activities.findIndex((a) => a.id === selectedId);
      if (found !== -1) return found;
    }
    return 0;
  }, [activities, selectedId]);

  const activity = activeIndex >= 0 ? activities[activeIndex] : null;

  useEffect(() => {
    if (activities.length === 0) {
      setIsExpanded(false);
      setSelectedId(null);
    }
  }, [activities.length]);

  useEffect(() => {
    if (!activity?.targetTime) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activity?.targetTime]);

  const countdownInfo = useMemo(() => {
    if (!activity?.targetTime) return null;
    const targetTimestamp =
      typeof activity.targetTime === 'number'
        ? activity.targetTime
        : activity.targetTime.getTime();
    const diffMs = targetTimestamp - now;
    const isOverdue = diffMs <= 0;
    const totalSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatted =
      hours > 0
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
    return {
      isOverdue,
      label: isOverdue ? `+${formatted}` : formatted,
    };
  }, [activity?.targetTime, now]);

  if (!activity) return null;

  const toneStyle = TONE_STYLES[activity.tone];
  const displayBadge = countdownInfo?.label ?? activity.badge;
  const hasMultiple = activities.length > 1;
  const isExpandable =
    !activity.directAction &&
    Boolean(
      activity.subtitle ||
        activity.primaryAction ||
        activity.secondaryAction ||
        activity.actionUrl ||
        hasMultiple,
    );

  const handlePillClick = () => {
    triggerHaptics(10);
    if (activity.directAction) {
      activity.directAction();
      return;
    }
    if (isExpandable) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleCycleActivity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultiple) return;
    triggerHaptics(8);
    const next = activities[(activeIndex + 1) % activities.length];
    setSelectedId(next.id);
  };

  const handleOpenAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activity.actionUrl) return;
    triggerHaptics(12);
    onOpenLink(activity.actionUrl);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-5">
      {/* 展開時の詳細カード */}
      {isExpanded && isExpandable && (
        <div
          className={`noir-subglass w-76 mb-2 p-4 rounded-2xl border ${toneStyle.border} shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-200`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 ${toneStyle.text}`}
              >
                {renderKindIcon(activity.kind, 'w-3 h-3')}
                {activity.kind === 'focus'
                  ? 'Focus Mode'
                  : activity.kind === 'alert'
                    ? 'Connection Alert'
                    : activity.kind === 'processing'
                      ? 'Background Task'
                      : activity.kind === 'wakelock'
                        ? 'Wake Lock'
                        : 'Live Activity'}
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
            {activity.onDismiss && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptics(8);
                  setIsExpanded(false);
                  activity.onDismiss?.();
                }}
                aria-label="閉じる"
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* アクションボタン群 */}
          {(activity.primaryAction || activity.secondaryAction) && (
            <div className="flex items-center gap-2">
              {activity.primaryAction && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptics(10);
                    setIsExpanded(false);
                    activity.primaryAction?.onClick();
                  }}
                  className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${toneStyle.primaryBtn}`}
                >
                  {renderActionIcon(activity.primaryAction.icon)}
                  <span>{activity.primaryAction.label}</span>
                </button>
              )}
              {activity.secondaryAction && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptics(8);
                    activity.secondaryAction?.onClick();
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 border ${
                    activity.secondaryAction.variant === 'danger'
                      ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                  }`}
                >
                  {renderActionIcon(activity.secondaryAction.icon)}
                  <span>{activity.secondaryAction.label}</span>
                </button>
              )}
            </div>
          )}

          {/* URLアクション */}
          {activity.actionUrl && (
            <button
              type="button"
              onClick={handleOpenAction}
              className={`w-full py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${toneStyle.primaryBtn}`}
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

          {/* 複数アクティビティがある場合の切替リスト */}
          {hasMultiple && (
            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
              {activities.map((item) => {
                const isSelected = item.id === activity.id;
                const itemTone = TONE_STYLES[item.tone];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptics(8);
                      setSelectedId(item.id);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border transition-colors ${
                      isSelected
                        ? `bg-white/10 text-white ${itemTone.border}`
                        : 'bg-white/5 text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${itemTone.dot}`}
                    />
                    <span className="truncate max-w-28">{item.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 常駐するボトムピル本体 */}
      <div
        onClick={handlePillClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePillClick();
          }
        }}
        className={`noir-subglass cursor-pointer flex items-center gap-2.5 px-4 py-2 rounded-full border ${toneStyle.border} shadow-2xl hover:border-white/25 transition-all active:scale-98 select-none`}
      >
        {/* 左インジケーター（スピナー or ドット） */}
        {activity.isSpinner ? (
          <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${toneStyle.text}`} />
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            {activity.isPulsing && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${toneStyle.ping}`}
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${toneStyle.dot}`}
            />
          </span>
        )}

        {/* バッジ & タイトル */}
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 min-w-0">
          {displayBadge && (
            <>
              <span
                className={`font-mono text-xs shrink-0 ${
                  countdownInfo?.isOverdue
                    ? 'text-red-400 animate-pulse'
                    : toneStyle.text
                }`}
              >
                {displayBadge}
              </span>
              <span className="text-zinc-600 shrink-0">|</span>
            </>
          )}
          <span className="truncate max-w-40 sm:max-w-56">
            {activity.title}
          </span>
        </div>

        {/* インライン操作ボタン（Focusの一時停止/再開など） */}
        {activity.inlineAction && (
          <button
            type="button"
            aria-label={activity.inlineAction.ariaLabel}
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptics(8);
              activity.inlineAction?.onClick();
            }}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            {activity.inlineAction.icon === 'pause' ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
          </button>
        )}

        {/* 複数件バッジ（クリックで次のアクティビティへ切替） */}
        {hasMultiple && (
          <button
            type="button"
            onClick={handleCycleActivity}
            title="次のアクティビティへ切替"
            className="px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-gray-300 shrink-0 transition-colors"
          >
            +{activities.length - 1}
          </button>
        )}

        {/* 展開インジケーター */}
        {isExpandable && (
          <div className="text-zinc-400 shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
