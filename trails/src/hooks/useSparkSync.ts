'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SparkItem } from '@/types';
import { atlasFetch } from '@atlas/shared/api';

const extractSparks = (json: unknown): SparkItem[] => {
  if (Array.isArray(json)) return json as SparkItem[];
  if (
    json &&
    typeof json === 'object' &&
    'data' in json &&
    Array.isArray((json as { data?: unknown }).data)
  ) {
    return (json as { data: SparkItem[] }).data;
  }
  return [];
};

export function useSparkSync(isAuthenticated: boolean) {
  const [sparks, setSparks] = useState<SparkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSparks = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await atlasFetch('/sparks', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Sparksの取得に失敗しました (${response.status})`);
      }
      const json: unknown = await response.json();
      setSparks(extractSparks(json));
    } catch (fetchError) {
      console.error('Failed to fetch sparks:', fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Sparksの取得に失敗しました',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSparks([]);
      setError(null);
      return;
    }
    void fetchSparks();
  }, [isAuthenticated, fetchSparks]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleRefreshSparks = () => {
      void fetchSparks();
    };
    window.addEventListener('refresh_sparks', handleRefreshSparks);
    return () => {
      window.removeEventListener('refresh_sparks', handleRefreshSparks);
    };
  }, [isAuthenticated, fetchSparks]);

  return {
    sparks,
    setSparks,
    isLoading,
    error,
    fetchSparks,
  };
}
