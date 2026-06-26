// src/hooks/useGoogleCalendar.ts
import { useState, useCallback } from 'react';
import { atlasFetch } from '@/utils/api';

export interface GoogleEvent {
  id: string;
  title: string;
  note: string | null;
  date: string | null;
  url: string | null;
}

export const useGoogleCalendar = (
  isAuthenticated: boolean,
  onSyncStart: () => void,
  onSyncEnd: () => void,
) => {
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);

  const fetchGoogleEvents = useCallback(async () => {
    if (!isAuthenticated) return;
    onSyncStart;
    try {
      const res = await atlasFetch('/calendar/events');
      if (res.ok) {
        const data = await res.json();
        setGoogleEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch google events', e);
    } finally {
      onSyncEnd();
    }
  }, [isAuthenticated]);

  return { googleEvents, fetchGoogleEvents };
};
