import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@/types';
import { triggerHaptics } from '@/lib/haptics';

export type FocusTimerMode = 'pomodoro' | 'stopwatch';

const POMODORO_SECONDS = 25 * 60;

export const formatFocusTime = (totalSec: number) => {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

export function useFocusSession(
  addToast: (msg: string, type?: 'info' | 'alert') => void,
) {
  const [task, setTask] = useState<Partial<Task> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FocusTimerMode>('pomodoro');
  const [seconds, setSeconds] = useState(POMODORO_SECONDS);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive || !task) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (mode === 'stopwatch') {
          return prev + 1;
        }
        if (prev <= 1) {
          setIsActive(false);
          triggerHaptics([100, 50, 100]);
          addToast(
            'ポモドーロ（25分）が終了しました！小休憩に入りましょう ☕',
            'info',
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, mode, task, addToast]);

  const startFocus = useCallback((nextTask: Partial<Task>) => {
    if (!nextTask) return;
    setTask((prevTask) => {
      const isSameTask =
        prevTask && nextTask.id && prevTask.id === nextTask.id;
      if (!isSameTask) {
        setIsActive(false);
        setMode('pomodoro');
        setSeconds(POMODORO_SECONDS);
      }
      return nextTask;
    });
    setIsOpen(true);
  }, []);

  const minimizeFocus = useCallback(() => {
    setIsOpen(false);
  }, []);

  const restoreFocus = useCallback(() => {
    if (task) setIsOpen(true);
  }, [task]);

  const endFocus = useCallback(() => {
    setIsActive(false);
    setIsOpen(false);
    setTask(null);
    setMode('pomodoro');
    setSeconds(POMODORO_SECONDS);
  }, []);

  const changeMode = useCallback((newMode: FocusTimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setSeconds(newMode === 'pomodoro' ? POMODORO_SECONDS : 0);
  }, []);

  const toggleRunning = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setSeconds(mode === 'pomodoro' ? POMODORO_SECONDS : 0);
  }, [mode]);

  return {
    task,
    isOpen,
    isMinimized: Boolean(task) && !isOpen,
    mode,
    seconds,
    isActive,
    startFocus,
    minimizeFocus,
    restoreFocus,
    endFocus,
    changeMode,
    toggleRunning,
    resetTimer,
  };
}
