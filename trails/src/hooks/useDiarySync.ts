// src/hooks/useDiarySync.ts
import { useState, useCallback } from 'react';
import { atlasFetch } from '@/utils/api';
import { DiaryItem } from '@/types';

export const useDiarySync = (
  isAuthenticated: boolean,
  onSyncStart: () => void,
  onSyncEnd: () => void,
) => {
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);

  const fetchDiaries = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await atlasFetch('/diaries', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();

        setDiaries(data.diaries || []);
      }
    } catch (e) {
      console.error('Failed to fetch diaries', e);
    }
  }, [isAuthenticated]);

  const syncDiary = useCallback(async () => {
    if (!isAuthenticated) return;
    onSyncStart();
    try {
      const res = await atlasFetch('/diaries/sync', {
        method: 'POST',
      });
      /*
      if (res.ok) {
        // 保存後、最新データを再取得
        fetchDiaries();
      }
      */
    } finally {
      onSyncEnd();
    }
  }, [fetchDiaries, onSyncStart, onSyncEnd]);

  return { diaries, fetchDiaries, syncDiary };
};
