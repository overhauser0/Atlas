'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import AssetGrid from '@/components/ui/AssetGrid';
import { useAssetSearch } from '@/hooks/useAssetSearch';

interface PersonPhotoModalProps {
  isOpen: boolean;
  personId: string | null;
  personName: string;
  onClose: () => void;
}

export default function PersonPhotoModal({
  isOpen,
  personId,
  personName,
  onClose,
}: PersonPhotoModalProps) {
  const { assets, isLoading, isError } = useAssetSearch(
    isOpen && personId ? { personId } : null,
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-photo-title"
      className="fixed inset-0 z-[60] flex flex-col bg-white"
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <h2
            id="person-photo-title"
            className="truncate text-lg font-bold text-slate-800"
          >
            {personName}の写真
          </h2>
          <p className="text-xs text-slate-500">
            {isLoading ? '読み込み中...' : `${assets?.length ?? 0} items`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="写真を閉じる"
          className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            写真を読み込んでいます...
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="flex h-full items-center justify-center text-sm text-red-600"
          >
            写真の取得に失敗しました
          </div>
        ) : assets?.length ? (
          <AssetGrid assets={assets} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            この人物の写真はありません
          </div>
        )}
      </div>
    </div>
  );
}
