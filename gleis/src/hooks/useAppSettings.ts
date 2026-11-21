import { useEffect, useState } from 'react';
import type { AppSettings } from '@/types';

const STORAGE_KEY = 'gleis_settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  shrinkEmptyPastDays: true,
  syncInterval: 5,
  notificationInterval: 30,
  alarmTime: '',
  wakeLockEnabled: true,
  showCompletedInCalendar: false,
  isChargedModel: false,
};

export function useAppSettings() {
  const [appSettings, setAppSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setAppSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      console.warn('Failed to load gleis_settings:', e);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings));
  }, [appSettings, hasLoaded]);

  return { appSettings, setAppSettings };
}
