// gleis/src/hooks/usePieceSync.ts
import { useState, useCallback } from 'react';
import { LifeItem } from '@/types';
import { atlasFetch } from '@/utils/api';
import { markCategory } from '@/utils/grouping';

export const usePieceSync = (
  isAuthenticated: boolean,
  onSyncStart: () => void,
  onSyncEnd: () => void,
) => {
  const [events, setEvents] = useState<LifeItem[]>([]);
  const [tasks, setTasks] = useState<LifeItem[]>([]);
  const [isPiecesLoading, setIsPiecesLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const fetchLastSyncTime = useCallback(async () => {
    try {
      const res = await atlasFetch('/pieces/sync', {
        method: 'GET',
      });
      if (!res.ok) return null;
      const syncInfo = await res.json();
      const time = new Date(syncInfo.lastSyncTime).getTime();
      setLastSyncTime(time);
      return time;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }, []);

  const fetchPieces = useCallback(
    async (isSilent = false) => {
      if (!isAuthenticated) return;
      if (!isSilent) setIsPiecesLoading(true);

      try {
        await fetchLastSyncTime();
        const res = await atlasFetch(
          '/pieces?area=Life&excludeStatus=Canceled',
          { method: 'GET' },
        );

        if (!res.ok) return;

        const data = await res.json();

        // gleisのタスク型をLifeItemへ変換
        const mappedItems: LifeItem[] = data.pieces
          .filter((p: any) => p.area === 'Life')
          .map((p: any) => {
            return {
              id: p.id,
              title: p.title,
              status: p.status,
              date: p.date,
              area: p.area,
              type: p.type,
              topics: p.topics || [],
              flags: p.flags || [],
              fkw: p.fkw || [],
              note: p.note || '',
              url: p.url || '',
              prefs: p.prefs || [],
              imageUrl: p.imageUrl || '',
              iconType: p.flags?.includes('Food') ? 'food' : 'leaf',
              source: p.source,
              category: markCategory(p),
            };
          });

        setEvents(mappedItems.filter((i) => i.type === 'Event'));
        setTasks(mappedItems.filter((i) => i.type === 'Task'));
      } finally {
        setIsPiecesLoading(false);
      }
    },
    [isAuthenticated, fetchLastSyncTime],
  );

  const handleNotionSync = useCallback(
    async (force = false) => {
      onSyncStart();
      try {
        const last = (await fetchLastSyncTime()) || 0;
        if (force || new Date().getTime() - last >= 15 * 60 * 1000) {
          await atlasFetch('/pieces/sync', {
            method: 'POST',
          });
        }
      } catch (e) {
        console.warn(e);
      } finally {
        onSyncEnd();
      }
    },
    [fetchPieces, onSyncStart, onSyncEnd],
  );

  return {
    events,
    tasks,
    isPiecesLoading,
    lastSyncTime,
    fetchPieces,
    handleNotionSync,
  };
};
