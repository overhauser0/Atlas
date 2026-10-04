// src/hooks/usePaperless.ts
import { useState, useCallback } from 'react';
import { atlasFetch } from '@/utils/api';

export interface PaperlessDocument {
  id: number;
  paperless_id: number;
  title: string;
  asn: number | null;
  document_type: string | null;
  correspondent: string | null;
  tags: string[];
}

export const usePaperless = () => {
  const [documents, setDocuments] = useState<PaperlessDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ドキュメントの検索処理
  const searchDocuments = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('title', query);

      // Gleisからのリクエストは常にWorkに固定する
      params.append('correspondent', 'Work');

      const res = await atlasFetch(`/paperless?${params.toString()}`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error('Failed to fetch documents');

      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (e) {
      console.warn('Search Documents Error:', e);
      setDocuments([]); // エラー時は空にする
    } finally {
      setIsLoading(false);
    }
  }, []);

  // プレビューURLの生成処理
  const getDocumentViewUrl = useCallback((paperlessId: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${baseUrl}/api/v1/paperless/${paperlessId}/view`;
  }, []);

  return {
    documents,
    isLoading,
    searchDocuments,
    getDocumentViewUrl,
  };
};
