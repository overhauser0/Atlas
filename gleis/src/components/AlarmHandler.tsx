'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from './Toast';

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
}

export default function AlarmHandler({ appSettings, setAppSettings }: Props) {
  const { addToast } = useToast();
  const [isAlerting, setIsAlerting] = useState(false);

  const triggerAlarm = useCallback(() => {
    setAppSettings((s: any) => ({
      ...s,
      alarmTime: '',
    }));

    addToast('⏰ Alarm: Time to switch tasks.', 'alert');
    setIsAlerting(true);

    // バイブレーション
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // 10秒後に自動停止
    setTimeout(() => setIsAlerting(false), 10000);
  }, [addToast, setAppSettings]);

  const checkAlarm = useCallback(() => {
    const alarmTime = appSettings.alarmTime;
    if (!alarmTime) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 時刻が一致したらアラーム起動
    if (currentTime === alarmTime) {
      triggerAlarm();
    }
  }, [appSettings.alarmTime, triggerAlarm]);

  // 1秒ごとにチェック
  useEffect(() => {
    const timer = setInterval(checkAlarm, 1000);
    return () => clearInterval(timer);
  }, [checkAlarm]);

  if (!isAlerting) return null;

  return (
    <div
      className="fixed inset-0 cursor-pointer z-[60] animate-pulse pointer-events-auto"
      onClick={() => setIsAlerting(false)}
    >
      {/* 画面の縁の赤いグロウ */}
      <div className="absolute inset-0 border-[4px] border-red-500/30 rounded-none md:rounded-[2rem] m-0 md:m-4" />
      {/* 画面全体への薄いオーバーレイ */}
      <div className="absolute inset-0 bg-red-500/5" />

      {/* 停止ラベル */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-red-500/80 text-[10px] font-bold tracking-[0.2em] uppercase">
        Click anywhere to dismiss
      </div>
    </div>
  );
}
