'use client';
import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appSettings: any;
  setAppSettings: (s: any) => void;
}

export default function QuickAlarmModal({
  isOpen,
  onClose,
  appSettings,
  setAppSettings,
}: Props) {
  if (!isOpen) return null;

  // appSettings から現在の値を取得
  const currentAlarm = appSettings.alarmTime || '';

  const handleUpdate = (time: string) => {
    setAppSettings((s: any) => ({
      ...s,
      alarmTime: time,
    }));

    // 時刻がセットされたら、少し余韻を残して閉じる
    /*
    if (time) {
      setTimeout(onClose, 500);
    }
    */
  };

  const handleClear = () => {
    setAppSettings((s: any) => ({
      ...s,
      alarmTime: '',
    }));
    onClose();
  };

  return (
    <>
      {/* 背後をクリックで閉じる（透明なレイヤー） */}
      <div className="fixed inset-0 z-70" onClick={onClose} />

      {/* ポップオーバー本体：時計の真下に来るように配置 */}
      <div className="absolute top-12 right-0 z-80 animate-in fade-in zoom-in-95 duration-200">
        <div className="noir-glass p-2 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2">
          <input
            type="time"
            value={currentAlarm}
            autoFocus
            onChange={(e) => handleUpdate(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-lg p-2 text-white text-lg font-mono focus:border-neon focus:outline-none scheme-dark"
          />

          {currentAlarm && (
            <button
              onClick={handleClear}
              className="text-[10px] text-gray-500 hover:text-red-400 font-bold px-2 tracking-tighter transition-colors"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>
    </>
  );
}
