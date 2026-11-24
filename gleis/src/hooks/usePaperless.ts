// src/hooks/usePaperless.ts
import { useState, useCallback } from 'react';
import { atlasFetch } from '@atlas/shared/api';
import { PaperlessDocument } from '@/types';

const getAtlasPublicHttpUrl = (): string | null => {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (!wsUrl) return null;
  try {
    const parsed = new URL(wsUrl);
    if (parsed.protocol === 'wss:') parsed.protocol = 'https:';
    else if (parsed.protocol === 'ws:') parsed.protocol = 'http:';
    else if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
};

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
      // 1. BFF 経由でワンタイムチケットを発行（60秒有効・1回限り）
      const res = await atlasFetch(`/paperless/${paperlessId}/ticket`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to get view ticket');

      const { ticket } = (await res.json()) as { ticket: string };
      const publicBaseUrl = getAtlasPublicHttpUrl();

      // 2. PWA内で開かず外部ブラウザ（Chrome等）へ渡すため、別オリジンの atlas-server URL を開く
      const viewUrl = publicBaseUrl
        ? `${publicBaseUrl}/paperless/view?ticket=${encodeURIComponent(ticket)}`
        : `/api/paperless/view?ticket=${encodeURIComponent(ticket)}`;
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
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
