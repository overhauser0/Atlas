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
  document_date: string | null;
}

export const usePaperless = () => {
  const [documents, setDocuments] = useState<PaperlessDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 起動時にWorkのドキュメント一覧を一括取得する
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('correspondent', 'Work');

      const res = await atlasFetch(`/paperless?${params.toString()}`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error('Failed to fetch documents');

      const data = await res.json();
      setDocuments(data.documents || []);
      return true;
    } catch (e) {
      console.warn('Fetch Documents Error:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openDocument = useCallback(async (paperlessId: number) => {
    try {
      // 1. X-API-KEY を使ってワンタイムチケットを発行
      const res = await atlasFetch(`/paperless/${paperlessId}/ticket`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to get view ticket');

      const { ticket } = await res.json();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

      // 2. チケット付きのURLを別タブで開く
      const viewUrl = `${baseUrl}/paperless/view?ticket=${ticket}`;
      window.open(viewUrl, '_blank');
    } catch (e) {
      console.error('Open Document Error:', e);
      // 必要であればトーストでエラーを表示
    }
  }, []);

  // アップロード処理
  const uploadDocuments = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const res = await atlasFetch(`/paperless/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
        }),
      );
      return true;
    } catch (e) {
      console.warn('Upload Documents Error:', e);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const syncDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await atlasFetch('/paperless/sync', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to sync documents');
      await fetchDocuments();
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    isUploading,
    syncDocuments,
    fetchDocuments,
    openDocument,
    uploadDocuments,
  };
};
