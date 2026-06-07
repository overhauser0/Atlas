// hooks/useIosKeyboardFix.ts
import { useEffect } from 'react';

// iOS Keyboard Fix
export const useIosKeyboardFix = () => {
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'SELECT' &&
        !target.isContentEditable
      ) {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      }
    };

    // イベント登録・解除処理
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
      capture: true,
    });
    return () =>
      document.removeEventListener('touchstart', handleTouchStart, {
        capture: true,
      });
  }, []);
};
