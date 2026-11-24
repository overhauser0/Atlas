'use client';
import React from 'react';
import { Menu, Zap, Loader2, Search, Bot } from 'lucide-react';

import type { AppSettings } from '@/types';

interface HeaderViewProps {
  currentTime: Date | null;
  hasNotifications: boolean;
  appSettings: AppSettings;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  isQuickAlarmOpen: boolean;
  setIsQuickAlarmOpen: (isOpen: boolean) => void;
  setIsActionPanelOpen: (isOpen: boolean) => void;
  isSyncing: boolean;
  onOpenCommandPalette: () => void;
  isAgentOpen: boolean;
  isAgentSending: boolean;
  onToggleAgent: () => void;
}

export default function HeaderView({
  currentTime,
  hasNotifications,
  appSettings,
  setIsMobileMenuOpen,
  isQuickAlarmOpen,
  setIsQuickAlarmOpen,
  setIsActionPanelOpen,
  isSyncing,
  onOpenCommandPalette,
  isAgentOpen,
  isAgentSending,
  onToggleAgent,
}: HeaderViewProps) {
  const today = currentTime ?? new Date();
  const longDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });

  const shortDate = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });

  return (
    <header className="mb-4 flex h-14 shrink-0 items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="sm:hidden p-2 text-gray-400 hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold tracking-wide">
          {/* スマホ用: sm(640px)以上で非表示 */}
          <span className="sm:hidden">{shortDate}</span>

          {/* PC用: デフォルトで非表示、sm(640px)以上でインライン表示 */}
          <span className="hidden sm:inline">{longDate}</span>
        </h1>
        <button
          onClick={onOpenCommandPalette}
          className="hidden min-w-0 items-center justify-between rounded-xl border border-white/10 px-4 py-1 text-left shadow-lg transition-all hover:border-white/20 hover:bg-white/5 group noir-glass sm:mx-6 sm:flex sm:w-auto sm:max-w-xl sm:flex-1 sm:py-2.5"
          aria-label="Open command palette"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-gray-500 transition-colors group-hover:text-gray-400" />
            <span className="truncate text-sm text-gray-500 transition-colors group-hover:text-gray-400">
              Type a command, search items, or ask AI...
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 sm:flex">
            <kbd className="rounded border border-white/10 bg-white/10 px-2 py-1 font-mono text-[10px] text-gray-400">
              Ctrl
            </kbd>
            <kbd className="rounded border border-white/10 bg-white/10 px-2 py-1 font-mono text-[10px] text-gray-400">
              K
            </kbd>
          </span>
        </button>
      </div>

      {/* 時計&Agent&通知ボタン */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <button
          onClick={() => setIsQuickAlarmOpen(!isQuickAlarmOpen)}
          className="group flex items-end transition-all active:scale-95"
        >
          <div className="text-xl text-white font-bold font-mono tracking-widest group-hover:text-neon transition-colors">
            {currentTime?.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            }) || '--:--'}
          </div>
          {/* アラームがある場合ドットで表示 */}
          <div className="h-1 mt-0.5">
            {appSettings.alarmTime && (
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={onToggleAgent}
          className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
            isAgentOpen
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.2)]'
              : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10 hover:text-amber-300'
          }`}
          aria-label="Toggle AI Agent"
          aria-pressed={isAgentOpen}
          title={
            isAgentSending
              ? 'AI Agent 実行中 (Cmd/Ctrl + J)'
              : 'AI Agent (Cmd/Ctrl + J)'
          }
        >
          <Bot className="w-5 h-5" />
          {isAgentSending && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 ring-2 ring-black" />
            </span>
          )}
        </button>
        <button
          onClick={() => setIsActionPanelOpen(true)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
            isSyncing
              ? 'bg-neon/10 border-neon/30 text-neon'
              : hasNotifications
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'
          }`}
          aria-label="Open Control Center"
          title={
            isSyncing
              ? '処理・同期中'
              : hasNotifications
                ? '未読通知または期限切れタスクがあります'
                : 'Control Center'
          }
        >
          {isSyncing ? (
            <Loader2 className="w-5 h-5 animate-spin text-neon" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          {hasNotifications && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 ring-2 ring-black" />
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
