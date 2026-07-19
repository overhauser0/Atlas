'use client';
import {
  Monitor,
  Zap,
  Bell,
  Clock,
  RefreshCw,
  Keyboard,
  Activity,
  Laptop,
  Smartphone,
  ServerCrash,
} from 'lucide-react';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  clientType: 'extension' | 'gleis' | string;
}

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
  wsStatus?: 'connected' | 'connecting' | 'disconnected';
  connectedDevices?: DeviceInfo[];
  ownDeviceId?: string;
}

export default function SettingsView({
  appSettings,
  setAppSettings,
  wsStatus = 'connecting',
  connectedDevices = [],
  ownDeviceId = '',
}: Props) {
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
                className="bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-white text-sm focus:border-neon focus:outline-none scheme-dark"
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

      {/* --- Section: Web Socket --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Activity className="w-3.5 h-3.5" />
          Remote Sync
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          {/* Own Status */}
          <div className="flex items-center justify-between p-5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/10">
                {wsStatus === 'connected' && (
                  <Activity className="w-4 h-4 text-green-400" />
                )}
                {wsStatus === 'connecting' && (
                  <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                )}
                {wsStatus === 'disconnected' && (
                  <ServerCrash className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Connection Status
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {wsStatus === 'connected' && (
                    <span className="text-green-400">
                      🟢 Connected to Atlas
                    </span>
                  )}
                  {wsStatus === 'connecting' && (
                    <span className="text-yellow-400">🟡 Connecting...</span>
                  )}
                  {wsStatus === 'disconnected' && (
                    <span className="text-red-400">🔴 Disconnected</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Connected Devices List */}
          <div className="p-5">
            <div className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Active Devices ({connectedDevices.length})
            </div>
            {connectedDevices.length === 0 ? (
              <div className="text-sm text-gray-600 text-center py-4">
                No other devices found.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {connectedDevices.map((device) => {
                  const isMe = device.deviceId === ownDeviceId;
                  const isExtension = device.clientType === 'extension';

                  return (
                    <div
                      key={device.deviceId}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isMe
                          ? 'bg-white/10 border-white/20'
                          : 'bg-black/40 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isExtension ? (
                          <Laptop className="w-4 h-4 text-green-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-blue-400" />
                        )}
                        <div className="flex flex-col">
                          <span
                            className={`text-sm font-medium ${isMe ? 'text-white' : 'text-gray-300'}`}
                          >
                            {device.deviceName} {isMe && '(This Device)'}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                            {device.clientType}
                          </span>
                        </div>
                      </div>
                      {isExtension && !isMe && (
                        <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md border border-green-400/20">
                          READY
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
              4 <span className="text-gray-500">// Meeting</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              5 <span className="text-gray-500">// Review</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              6 <span className="text-gray-500">// Note</span>
            </code>
            <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
              7 <span className="text-gray-500">// Notifications</span>
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
