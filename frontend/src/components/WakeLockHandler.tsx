'use client';

import { useEffect, useRef } from 'react';

export default function WakeLockHandler() {
  const wakeLock = useRef<any>(null);

  const requestWakeLock = async () => {
    // 1. ページが非表示、またはすでに取得済みの場合は何もしない
    if (document.visibilityState !== 'visible' || wakeLock.current !== null)
      return;

    try {
      wakeLock.current = await (navigator as any).wakeLock.request('screen');

      // 解放された時の処理
      wakeLock.current.addEventListener('release', () => {
        wakeLock.current = null;
      });

      console.log('☀️ Wake Lock is active');
    } catch (err: any) {
      if (err.name !== 'NotAllowedError')
        console.error(`${err.name}, ${err.message}`);
    }
  };

  useEffect(() => {
    // 初回実行
    requestWakeLock();

    // 2. ページが再び表示された時に再リクエストするリスナー
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null; // UIは持たない
}
