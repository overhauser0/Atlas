import { useCallback, useEffect, useRef, useState } from 'react';

export function useWakeLock(isEnabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // すでに解放済みの場合は無視
      }
      wakeLockRef.current = null;
    }
    setIsWakeLockActive(false);
  }, []);

  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }
    if (wakeLockRef.current !== null) {
      setIsWakeLockActive(true);
      return true;
    }
    if (document.visibilityState !== 'visible') return false;

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setIsWakeLockActive(true);

      sentinel.addEventListener('release', () => {
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      });

      return true;
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : '';
      if (errorName !== 'NotAllowedError') {
        console.warn('WakeLock request failed:', err);
      }
      setIsWakeLockActive(false);
      return false;
    }
  }, []);

  useEffect(() => {
    setIsWakeLockSupported(
      typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    );
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      void releaseWakeLock();
      return;
    }

    // 初回およびタブ復帰時は自動取得を試行し、失敗した場合はピルからの明示タップに委ねる
    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled) {
        window.setTimeout(() => {
          void requestWakeLock();
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [isEnabled, requestWakeLock, releaseWakeLock]);

  return {
    isWakeLockActive,
    isWakeLockSupported,
    requestWakeLock,
  };
}
