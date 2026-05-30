'use client';
import { useEffect, useRef } from 'react';

// PropsでON/OFFのフラグを受け取る
interface Props {
  isEnabled: boolean;
}

export default function WakeLockHandler({ isEnabled }: Props) {
  const wakeLock = useRef<any>(null);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator) || wakeLock.current !== null) return;
    if (document.visibilityState !== 'visible') return;

    try {
      wakeLock.current = await (navigator as any).wakeLock.request('screen');
      wakeLock.current.addEventListener('release', () => {
        wakeLock.current = null;
        console.log('🌙 Wake Lock released');
      });
      console.log('☀️ Wake Lock is active');
    } catch (err: any) {
      // ユーザー操作がないことによる NotAllowedError はエラー表示しない
      if (err.name === 'NotAllowedError') {
        console.log('⏳ Wake Lock awaiting user interaction...');
      } else {
        // それ以外の予期せぬエラーは warn (警告) に留める
        console.warn(`WakeLock Warning: ${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock.current) {
      wakeLock.current.release();
      wakeLock.current = null;
    }
  };

  useEffect(() => {
    // isEnabled が false になったら即座にロックを解除して終了
    if (!isEnabled) {
      releaseWakeLock();
      return;
    }

    // ONの場合のリスナー登録処理
    const handleUserInteraction = () => {
      requestWakeLock();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // クリーンアップ
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isEnabled]); // isEnabled の変更を監視して再実行

  return null;
}
