'use client';
import React, { useState, useEffect } from 'react';
import { Monitor, Zap, Bell, Clock, RefreshCw } from 'lucide-react';

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
    <div
      className="flex-1 px-4 pb-20 max-w-2xl mx-auto w-full space-y-10 overflow-y-auto 
      [&::-webkit-scrollbar]:w-1 
      [&::-webkit-scrollbar-thumb]:bg-white/10 
      [&::-webkit-scrollbar-thumb]:rounded-full"
    >
      {/* --- Section: View Settings --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] px-1">
          <Monitor className="w-3.5 h-3.5" />
          Display
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Shrink empty past days
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Automatically reduce the width of past columns to 60% if they
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
        </div>
      </section>

      {/* --- Section: Automation --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] px-1">
          <RefreshCw className="w-3.5 h-3.5" />
          Automation
        </h2>

        <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <div className="text-sm font-medium text-gray-200">
                Auto Sync Interval
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Frequency of background synchronization with Notion. Set to 0 to
                disable.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                min="0"
                max="60"
                value={appSettings.syncInterval || 0}
                onChange={(e) =>
                  setAppSettings((s: any) => ({
                    ...s,
                    syncInterval: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-16 bg-black/50 border border-white/10 rounded-lg p-2 text-center text-sm text-white focus:border-neon focus:outline-none transition-colors"
              />
              <span className="text-xs text-gray-500 font-medium">min</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="60"
            step="1"
            value={appSettings.syncInterval || 0}
            onChange={(e) =>
              setAppSettings((s: any) => ({
                ...s,
                syncInterval: parseInt(e.target.value),
              }))
            }
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon"
          />
        </div>
      </section>

      {/* --- Section: Alerts --- */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] px-1">
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
    </div>
  );
}
