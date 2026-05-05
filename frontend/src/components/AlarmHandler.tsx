"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "./Toast";

export default function AlarmHandler() {
  const { addToast } = useToast();
  const [isAlerting, setIsAlerting] = useState(false);

  const checkAlarm = useCallback(() => {
    const alarmTime = localStorage.getItem("gleis_alarm_time");
    if (!alarmTime) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (currentTime === alarmTime) {
      triggerAlarm();
    }
  }, [addToast]);

  const triggerAlarm = () => {
    localStorage.removeItem("gleis_alarm_time");
    addToast("⏰ Alarm: Time to switch tasks.", "alert");
    setIsAlerting(true);

    // デバイスが対応していればバイブレーション
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // 💡 10秒後の自動停止タイマー（念のため残す）
    setTimeout(() => setIsAlerting(false), 10000);
  };

  useEffect(() => {
    const timer = setInterval(checkAlarm, 1000);
    return () => clearInterval(timer);
  }, [checkAlarm]);

  if (!isAlerting) return null;

  return (
    // 💡 pointer-events-auto にし、onClick で停止できるように変更
    <div
      className="fixed inset-0 cursor-pointer z-[60] animate-pulse pointer-events-auto"
      onClick={() => setIsAlerting(false)}
    >
      {/* 画面の縁の赤いグロウ */}
      <div className="absolute inset-0 border-[4px] border-red-500/30 rounded-none md:rounded-[2rem] m-0 md:m-4" />
      {/* 画面全体への薄いオーバーレイ */}
      <div className="absolute inset-0 bg-red-500/5" />

      {/* 💡 停止を促す小さなラベル（お好みで） */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-red-500/80 text-[10px] font-bold tracking-[0.2em] uppercase">
        Click anywhere to dismiss
      </div>
    </div>
  );
}
