// gleis/src/hooks/usePieceSync.ts
import { useState, useCallback } from 'react';
import { LifeItem } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { markCategory, judgeDefaultIcon } from '@/utils/piece';

interface RawApiPiece {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  start_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  area: string | null;
  type: string | null;
  topics?: string[] | null;
  flags?: string[] | null;
  fkw?: string[] | null;
  note?: string | null;
  url?: string | null;
  prefs?: string[] | null;
  imageUrl?: string | null;
  source: string;
}

export const usePieceSync = (
  isAuthenticated: boolean,
  onSyncStart: () => void,
  onSyncEnd: () => void,
) => {
  const [items, setItems] = useState<LifeItem[]>([]);
  const [events, setEvents] = useState<LifeItem[]>([]);
  const [tasks, setTasks] = useState<LifeItem[]>([]);
  const [notes, setNotes] = useState<LifeItem[]>([]);
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

        const data = (await res.json()) as { pieces?: RawApiPiece[] };
        const pieces = Array.isArray(data.pieces) ? data.pieces : [];

        // gleisのタスク型をLifeItemへ変換
        const mappedItems: LifeItem[] = pieces
          .filter((p) => p.area === 'Life')
          .map((p) => {
            const baseItem: LifeItem = {
              id: p.id,
              title: p.title,
              status: p.status,
              start_date: p.start_date,
              start_time: p.start_time,
              end_date: p.end_date,
              end_time: p.end_time,
              area: p.area,
              type: p.type,
              topics: p.topics || [],
              flags: p.flags || [],
              fkw: p.fkw || [],
              note: p.note || '',
              url: p.url || '',
              prefs: p.prefs || [],
              imageUrl: p.imageUrl || '',
              iconType: '',
              source: p.source,
            };
            return {
              ...baseItem,
              iconType: judgeDefaultIcon(baseItem),
              category: markCategory(baseItem),
            };
          });

        setItems(mappedItems);
        setEvents(mappedItems.filter((i) => i.type === 'Event'));
        setTasks(mappedItems.filter((i) => i.type === 'Task'));
        setNotes(mappedItems.filter((i) => i.type === 'Note'));
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
    items,
    events,
    tasks,
    notes,
    isPiecesLoading,
    lastSyncTime,
    fetchPieces,
    handleNotionSync,
  };
};
