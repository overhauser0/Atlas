// src/hooks/useDiarySync.ts
import { useState, useCallback, useRef } from 'react';
import { atlasFetch } from '@atlas/shared/api';
import { DiaryItem } from '@/types';

interface DiaryRange {
  startDate: string;
  endDate: string;
}

export const useDiarySync = (isAuthenticated: boolean) => {
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const activeRange = useRef<DiaryRange | null>(null);
  const requestId = useRef(0);

  const fetchDiaries = useCallback(
    async (startDate?: string, endDate?: string): Promise<boolean> => {
      if (!isAuthenticated) return false;

      if (startDate && endDate) {
        const nextRange = { startDate, endDate };
        const previousRange = activeRange.current;
        if (
          !previousRange ||
          previousRange.startDate !== startDate ||
          previousRange.endDate !== endDate
        ) {
          setDiaries([]);
        }
        activeRange.current = nextRange;
      }

      const range = activeRange.current;
      if (!range) return false;

      const currentRequestId = ++requestId.current;
      try {
        const params = new URLSearchParams({
          startDate: range.startDate,
          endDate: range.endDate,
        });
        const res = await atlasFetch(`/diaries?${params.toString()}`, {
          method: 'GET',
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch diaries: ${res.status}`);
        }

        const data = await res.json();
        if (currentRequestId === requestId.current) {
          setDiaries(data.diaries || []);
        }
        return true;
      } catch (e) {
        console.error('Failed to fetch diaries', e);
        return false;
      }
    },
    [isAuthenticated],
  );

  return { diaries, fetchDiaries };
};
