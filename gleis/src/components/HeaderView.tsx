'use client';
import React from 'react';
import { Menu, Bell } from 'lucide-react';

interface HeaderViewProps {
  currentTime: Date | null;
  hasNotifications: boolean;
  appSettings: any;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  isQuickAlarmOpen: boolean;
  setIsQuickAlarmOpen: (isOpen: boolean) => void;
  setIsActionPanelOpen: (isOpen: boolean) => void;
}

export default function HeaderView({
  currentTime,
  hasNotifications,
  appSettings,
  setIsMobileMenuOpen,
  isQuickAlarmOpen,
  setIsQuickAlarmOpen,
  setIsActionPanelOpen,
}: HeaderViewProps) {
  const today = new Date();
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
    <header className="h-14 mb-4 flex items-center justify-between px-2 shrink-0">
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
      </div>
      {/* 時計&通知ボタン */}
      <div className="flex items-center gap-4">
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
          onClick={() => setIsActionPanelOpen(true)}
          className={`relative w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full ${hasNotifications ? 'text-yellow-400' : 'text-zinc-300'} transition-all active:scale-95 border border-white/5`}
          aria-label="Open Control Center"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
