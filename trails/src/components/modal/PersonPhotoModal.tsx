'use client';

import { useEffect } from 'react';
import AssetGrid from '@/components/ui/AssetGrid';
import FullscreenHeader from '@/components/ui/FullscreenHeader';
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
      className="fixed inset-0 z-[60] flex flex-col bg-gray-100 animate-in fade-in duration-150"
    >
      <FullscreenHeader
        title={`${personName}の写真`}
        titleId="person-photo-title"
        subtitle={isLoading ? '読み込み中...' : `${assets?.length ?? 0} items`}
        onBack={onClose}
        backLabel="写真を閉じる"
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
        <div className="mx-auto max-w-5xl">
          {isLoading ? (
            <div className="trails-card p-10 text-center text-sm text-gray-500 animate-pulse">
              写真を読み込んでいます...
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="trails-card p-10 text-center text-sm text-red-600"
            >
              写真の取得に失敗しました
            </div>
          ) : assets?.length ? (
            <div className="trails-card p-4 md:p-5">
              <AssetGrid assets={assets} />
            </div>
          ) : (
            <div className="trails-card p-10 text-center text-sm text-gray-400">
              この人物の写真はありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
