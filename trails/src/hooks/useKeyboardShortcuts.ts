import { useEffect } from 'react';

interface ShortcutHandlers {
  onOpenSearchModal: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const isInput =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.isContentEditable;

      if (e.metaKey || e.ctrlKey) {
        if (isInput) return;
        switch (e.key) {
          case 'k':
            e.preventDefault();
            handlers.onOpenSearchModal();
            break;
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
