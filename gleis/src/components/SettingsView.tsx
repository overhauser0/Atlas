'use client';
import { Monitor, Zap, Bell, Clock, RefreshCw, Keyboard } from 'lucide-react';

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
}

export default function SettingsView({ appSettings, setAppSettings }: Props) {
  // アラーム設定
  const updateAlarm = (time: string) => {
    setAppSettings((s: any) => ({
      ...s,
      alarmTime: time,
    }));
  };

  return (
    <div className="flex-1 px-4 pb-20 mx-auto w-full space-y-10 overflow-y-auto noir-scrollbar ">
      {/* --- Section: View Settings --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Monitor className="w-3.5 h-3.5" />
          Display & Appearance
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          {/* 項目1: Shrink empty past days */}
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Shrink empty past days
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Automatically reduce the width of past columns to 40% if they
                contain no tasks.
              </p>
            </div>
            <button
              onClick={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  shrinkEmptyPastDays: !s.shrinkEmptyPastDays,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 ${appSettings.shrinkEmptyPastDays ? 'bg-neon shadow-[0_0_10px_rgba(0,112,243,0.4)]' : 'bg-gray-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${appSettings.shrinkEmptyPastDays ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* 項目2: Keep Screen On (WakeLock) */}
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Keep Screen On
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Prevent the device from sleeping while the app is open.
              </p>
            </div>
            <button
              onClick={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  wakeLockEnabled: !s.wakeLockEnabled,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 ${appSettings.wakeLockEnabled !== false ? 'bg-neon shadow-[0_0_10px_rgba(0,112,243,0.4)]' : 'bg-gray-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${appSettings.wakeLockEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </section>
      {/* --- Section: Automation --- */}
      <section className="flex flex-col gap-4">
        <h2 className="noir-label px-1 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Automation
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          {/* タスク同期設定（分） */}
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Task Sync Interval
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Interval for syncing tasks with Notion (minutes). Set to 0 to
                disable auto-sync.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                min="0"
                value={appSettings.syncInterval}
                onChange={(e) =>
                  setAppSettings((s: any) => ({
                    ...s,
                    syncInterval: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-16 noir-input p-2! text-center"
              />
              <span className="text-xs text-gray-500 font-medium">min</span>
            </div>
          </div>

          {/* 通知ポーリング設定（秒） */}
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Notification Poll Interval
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Interval for checking new notifications (seconds). Set to 0 to
                disable auto-check.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                min="0"
                step="10"
                value={appSettings.notificationInterval}
                onChange={(e) =>
                  setAppSettings((s: any) => ({
                    ...s,
                    notificationInterval: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-16 noir-input p-2! text-center"
              />
              <span className="text-xs text-gray-500 font-medium">sec</span>
            </div>
          </div>
        </div>
      </section>
      {/* --- Section: Alerts --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Bell className="w-3.5 h-3.5" />
          Alerts
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 flex items-center justify-between">
          <div className="pr-4">
            <div className="text-sm font-medium text-gray-200">
              Simple Alarm
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              One-time notification. Once triggered, the setting is cleared.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="time"
                value={appSettings.alarmTime || ''}
                onChange={(e) => updateAlarm(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-white text-sm focus:border-neon focus:outline-none [color-scheme:dark]"
              />
            </div>
            {appSettings.alarmTime && (
              <button
                onClick={() => updateAlarm('')}
                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Zap className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>
        </div>
      </section>
      {/* --- Section: Keyboard Shortcuts --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Keyboard className="w-3.5 h-3.5" />
          Keyboard Shortcuts
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 p-5 space-y-3">
          <div className="grid grid-cols-[1fr,auto] gap-4 text-sm">
            <div className="text-gray-400">Command Palette</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + K
            </code>
            <div className="text-gray-400">Sync Notion</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + S
            </code>
            <div className="text-gray-400">Lock Screen</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + L
            </code>
            <div className="text-gray-400">Create New Task</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + N
            </code>
            <div className="text-gray-400">Open Action Panel</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              Cmd/Ctrl + A
            </code>
            <div className="text-gray-400">Go To View</div>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              0 <span className="text-gray-500">// Home</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              1 <span className="text-gray-500">// WeeklyTask</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              2 <span className="text-gray-500">// Kanban</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              3 <span className="text-gray-500">// Calendar</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              4 <span className="text-gray-500">// Review</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              5 <span className="text-gray-500">// Notifications</span>
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
