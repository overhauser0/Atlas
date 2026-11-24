import { useCallback, useEffect, useState } from 'react';
import type { LocalNote } from '@/types';
import { atlasFetch } from '@atlas/shared/api';

export function useNoteSync(
  onError?: (message: string) => void,
) {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [areNotesLoading, setAreNotesLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setAreNotesLoading(true);
    try {
      const response = await atlasFetch('/notes');
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      setNotes(data.notes ?? data);
    } catch (error) {
      console.error(error);
      onError?.('ノートの取得に失敗しました');
    } finally {
      setAreNotesLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    window.addEventListener('refresh_notes', fetchNotes);
    return () => window.removeEventListener('refresh_notes', fetchNotes);
  }, [fetchNotes]);

  return { notes, areNotesLoading, fetchNotes };
}
