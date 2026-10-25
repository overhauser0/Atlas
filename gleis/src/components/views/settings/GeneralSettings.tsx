'use client';
import React from 'react';
import { Monitor, RefreshCw, Bell, Clock, Zap, Info } from 'lucide-react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import packageJson from '../../../../package.json';

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
}

export default function GeneralSettings({
  appSettings,
  setAppSettings,
}: Props) {
  const updateAlarm = (time: string) => {
    setAppSettings((s: any) => ({ ...s, alarmTime: time }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Display & Appearance */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <Monitor className="w-3.5 h-3.5" />
          Display & Appearance
        </h2>
        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Shrink empty past days
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Automatically reduce the width of past columns to 40% if they
                contain no tasks.
              </p>
            </div>
            <ToggleSwitch
              checked={appSettings.shrinkEmptyPastDays}
              onChange={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  shrinkEmptyPastDays: !s.shrinkEmptyPastDays,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Keep Screen On
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Prevent the device from sleeping while the app is open.
              </p>
            </div>
            <ToggleSwitch
              checked={appSettings.wakeLockEnabled !== false}
              onChange={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  wakeLockEnabled: !s.wakeLockEnabled,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between p-5 hover:bg-white/2 transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Show Completed Task
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Show Completed Task in Calendar View.
              </p>
            </div>
            <ToggleSwitch
              checked={appSettings.showCompletedInCalendar}
              onChange={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  showCompletedInCalendar: !s.showCompletedInCalendar,
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* Automation & Alerts (右カラムにまとめる) */}
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="noir-label px-1 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Automation
          </h2>
          <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 flex items-center justify-between">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Task Sync Interval
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Interval in minutes (0 to disable).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 px-1 noir-label">
            <Bell className="w-3.5 h-3.5" /> Alerts
          </h2>
          <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 flex items-center justify-between">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Simple Alarm
              </div>
              <p className="text-xs text-gray-500 mt-1">
                One-time notification.
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

        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 px-1 noir-label">
            <Info className="w-3.5 h-3.5" /> About
          </h2>
          <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-200">Version</div>
            <span className="text-sm font-mono text-gray-400">
              {packageJson.version}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
