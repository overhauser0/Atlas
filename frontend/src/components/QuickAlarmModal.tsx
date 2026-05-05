"use client";
import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAlarmModal({ isOpen, onClose }: Props) {
  const [tempAlarm, setTempAlarm] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTempAlarm(localStorage.getItem("gleis_alarm_time") || "");
    }
  }, [isOpen]);

  const handleSave = (time: string) => {
    setTempAlarm(time);
    if (time) {
      localStorage.setItem("gleis_alarm_time", time);
      // セットされたら少し余韻を残して自動で閉じる
      setTimeout(onClose, 500);
    } else {
      localStorage.removeItem("gleis_alarm_time");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背後をクリックで閉じる（透明なレイヤー） */}
      <div className="fixed inset-0 z-[70]" onClick={onClose} />

      {/* ポップオーバー本体：時計の真下に来るように配置 */}
      <div className="absolute top-12 right-0 z-[80] animate-in fade-in zoom-in-95 duration-200">
        <div className="noir-glass p-2 rounded-xl border border-white/20 shadow-2xl flex items-center gap-2">
          <input
            type="time"
            value={tempAlarm}
            autoFocus
            onChange={(e) => handleSave(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-lg p-2 text-white text-lg font-mono focus:border-neon focus:outline-none [color-scheme:dark]"
          />
          {tempAlarm && (
            <button
              onClick={() => {
                localStorage.removeItem("gleis_alarm_time");
                setTempAlarm("");
                onClose();
              }}
              className="text-[10px] text-gray-500 hover:text-red-400 font-bold px-2"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>
    </>
  );
}
