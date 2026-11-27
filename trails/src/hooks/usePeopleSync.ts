'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Person } from '@/types';
import { atlasFetch } from '@atlas/shared/api';

export function usePeopleSync(isAuthenticated: boolean) {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await atlasFetch('/people', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`人物一覧の取得に失敗しました (${response.status})`);
      }

      const data: { people?: Person[] } = await response.json();
      if (!Array.isArray(data.people)) {
        throw new Error('人物一覧のレスポンス形式が正しくありません');
      }
      setPeople(data.people);
    } catch (fetchError) {
      console.error('Failed to fetch people:', fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : '人物一覧の取得に失敗しました',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPeople([]);
      setError(null);
      return;
    }
    void fetchPeople();
  }, [isAuthenticated, fetchPeople]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleRefreshPeople = () => {
      void fetchPeople();
    };
    window.addEventListener('refresh_people', handleRefreshPeople);
    return () => {
      window.removeEventListener('refresh_people', handleRefreshPeople);
    };
  }, [isAuthenticated, fetchPeople]);

  return {
    people,
    isLoading,
    error,
    fetchPeople,
  };
}
