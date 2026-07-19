import { useEffect } from 'react';
import { ViewType } from '@/types';

interface ShortcutHandlers {
  onOpenCommandPalette: () => void;
  onSync: () => void;
  onLogout: () => void;
  onCreateTask: () => void;
  onOpenActionPanel: () => void;
  onNavigate: (view: ViewType) => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const isInput =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        active?.isContentEditable;

      // 1. コマンドパレットや新規作成などの「修飾キー(Cmd/Ctrl)」系ショートカット
      if (e.metaKey || e.ctrlKey) {
        if (isInput) return;
        switch (e.key) {
          case 'k':
            e.preventDefault();
            handlers.onOpenCommandPalette();
            break;
          case 's':
            e.preventDefault();
            handlers.onSync();
            break;
          case 'l':
            e.preventDefault();
            handlers.onLogout();
            break;
          case 'n':
            e.preventDefault();
            handlers.onCreateTask();
            break;
          case 'a':
            e.preventDefault();
            handlers.onOpenActionPanel();
            break;
        }
        return;
      }

      // 2. 画面遷移の「数字キー」系ショートカット (修飾キーなし)
      if (isInput || e.ctrlKey || e.altKey || e.metaKey) return;

      const keyMap: Record<string, ViewType> = {
        '0': 'home',
        '1': 'weekly',
        '2': 'kanban',
        '3': 'calendar',
        '4': 'meeting',
        '5': 'review',
        '6': 'note',
        '7': 'notifications',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        handlers.onNavigate(keyMap[e.key]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
