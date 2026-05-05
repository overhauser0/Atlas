"use client";

import { useEffect, useRef } from "react";

export default function WakeLockHandler() {
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    // 💡 Screen Wake Lock API がサポートされているか確認
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator) {
        try {
          wakeLock.current = await (navigator as any).wakeLock.request(
            "screen",
          );

          // ロックが解除された（手動スリープ等）際の再取得イベント
          wakeLock.current.addEventListener("release", () => {
            console.log("Wake Lock was released");
          });
        } catch (err: any) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    requestWakeLock();

    // タブの切り替えやアプリのバックグラウンドからの復帰時にも再取得する
    const handleVisibilityChange = async () => {
      if (wakeLock.current !== null && document.visibilityState === "visible") {
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // クリーンアップ時にロックを解放
      wakeLock.current?.release();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // UIは持たない
  return null;
}
