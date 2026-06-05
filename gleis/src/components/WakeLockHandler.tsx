'use client';
import { useEffect, useRef } from 'react';

interface Props {
  isEnabled: boolean;
  onStatusChange?: (isActive: boolean) => void;
}

export default function WakeLockHandler({ isEnabled, onStatusChange }: Props) {
  const wakeLock = useRef<any>(null);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator) || wakeLock.current !== null) return;
    if (document.visibilityState !== 'visible') return;

    try {
      wakeLock.current = await (navigator as any).wakeLock.request('screen');

      // ★取得成功時にステータスを更新
      onStatusChange?.(true);
      console.log('☀️ Wake Lock is active');

      wakeLock.current.addEventListener('release', () => {
        wakeLock.current = null;
        onStatusChange?.(false);
        console.log('🌙 Wake Lock released');
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.log('⏳ Wake Lock awaiting user interaction...');
      } else {
        console.warn(`WakeLock Warning: ${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock.current) {
      wakeLock.current.release();
      wakeLock.current = null;
    }
    onStatusChange?.(false);
  };

  useEffect(() => {
    if (!isEnabled) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();

    const handleUserInteraction = () => {
      if (wakeLock.current) return;
      requestWakeLock();
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled) {
        // OS復帰時は少し遅延させると成功しやすい
        setTimeout(requestWakeLock, 200);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isEnabled]);

  return null;
}
