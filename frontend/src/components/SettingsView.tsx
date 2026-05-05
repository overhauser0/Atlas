"use client";

import { useState, useEffect } from "react";

interface Props {
  appSettings: { shrinkEmptyPastDays: boolean };
  setAppSettings: (s: any) => void;
}

export default function SettingsView({ appSettings, setAppSettings }: Props) {
  // 💡 Hook（useState/useEffect）は必ずこの「関数ボディの中」に書く必要があります
  const [tempAlarm, setTempAlarm] = useState("");

  useEffect(() => {
    // コンポーネントのマウント時に保存されているアラーム時間を取得
    const savedAlarm = localStorage.getItem("gleis_alarm_time") || "";
    setTempAlarm(savedAlarm);
  }, []);

  const handleSetAlarm = (time: string) => {
    setTempAlarm(time);
    if (time) {
      localStorage.setItem("gleis_alarm_time", time);
    } else {
      localStorage.removeItem("gleis_alarm_time");
    }
  };

  return (
    <div className="flex-1 px-2 pb-6">
      <div className="noir-glass rounded-2xl p-6 md:p-8 border border-white/10 max-w-3xl">
        <h2 className="text-lg font-semibold text-white mb-6">Preferences</h2>

        <div className="space-y-4">
          {/* 既存の縮小設定 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div>
              <div className="text-sm font-medium text-gray-200">
                Shrink empty past days
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Automatically reduce the width of past columns to 60% if empty.
              </div>
            </div>
            <button
              onClick={() =>
                setAppSettings((s: any) => ({
                  ...s,
                  shrinkEmptyPastDays: !s.shrinkEmptyPastDays,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${appSettings.shrinkEmptyPastDays ? "bg-neon" : "bg-gray-600"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appSettings.shrinkEmptyPastDays ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>

          {/* 💡 新設：簡易アラーム設定 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div>
              <div className="text-sm font-medium text-gray-200">
                Simple Alarm
              </div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                One-time notification. Once triggered, the setting is cleared.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={tempAlarm}
                onChange={(e) => handleSetAlarm(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-neon focus:outline-none [color-scheme:dark]"
              />
              {tempAlarm && (
                <button
                  onClick={() => handleSetAlarm("")}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
