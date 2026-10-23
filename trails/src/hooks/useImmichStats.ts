'use client';

import { useState, useEffect, useCallback } from 'react';
import { atlasFetch } from '@/utils/api';

// === 型定義（DashboardViewの要件に合わせる） ===
export interface ImmichStats {
  total: number;
  images: number;
  videos: number;
  syncedAt: string | null;
  storage: { usedGb: number };
  state: {
    missingGps: number;
    missingDate: number;
  };
  dailyCounts: Record<string, number>; // ヒートマップ用 { 'YYYY-MM-DD': count }
  topMakes: { name: string; count: number }[];
  topModels: { name: string; count: number }[];
  topStates: { name: string; count: number }[];
  topFocalLengths: { name: string; count: number }[];
}

// 過去の useAssetSearch の役割もこのフック内に集約、または分離しますが、
// 今回は用途が明確なため統合します。
export interface ImmichAsset {
  id: string;
  deviceAssetId: string;
  fileCreatedAt: string;
  type: 'IMAGE' | 'VIDEO';
  thumbnailUrl: string;
  originalFileName: string;
  exif: {
    make?: string;
    model?: string;
    lensModel?: string;
    fNumber?: number;
    focalLength?: number;
    iso?: number;
    exposureTime?: string;
    [key: string]: any;
  } | null;
}

export function useImmichStats() {
  const [stats, setStats] = useState<ImmichStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // 1. ダッシュボード統計データの取得
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await atlasFetch('/immich/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');

      const jsonRes = await res.json();
      setStats(jsonRes.data);
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. メタデータの同期アクション
  const sync = useCallback(async () => {
    try {
      const res = await atlasFetch('/immich/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      // 同期成功後、統計データを再取得
      await fetchStats();
    } catch (err) {
      console.error('Sync error:', err);
      throw err;
    }
  }, [fetchStats]);

  // 3. 指定日のアセット一覧取得（DailyPhotoModal用）
  const fetchAssetsByDate = useCallback(
    async (date: string): Promise<ImmichAsset[]> => {
      try {
        const res = await atlasFetch(`/assets?date=${date}`);
        if (!res.ok) throw new Error(`Fetch failed for date: ${date}`);

        const data = await res.json();
        return data.assets || [];
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    [],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    isError,
    sync,
    fetchAssetsByDate,
  };
}
