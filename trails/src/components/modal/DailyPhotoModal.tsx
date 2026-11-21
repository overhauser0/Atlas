'use client';

import React, { useEffect } from 'react';
import AssetGrid from '@/components/ui/AssetGrid';
import FullscreenHeader from '@/components/ui/FullscreenHeader';
import { useAssetSearch } from '@/hooks/useAssetSearch';

interface DailyPhotoModalProps {
  isOpen: boolean;
  date: string | null;
  onClose: () => void;
}

export default function DailyPhotoModal({
  isOpen,
  date,
  onClose,
}: DailyPhotoModalProps) {
  const { assets, isLoading } = useAssetSearch(
    isOpen && date ? { date } : null,
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
      aria-labelledby="daily-photo-title"
      className="fixed inset-0 z-50 flex flex-col bg-gray-100 animate-in fade-in duration-150"
    >
      <FullscreenHeader
        title={`${date ?? ''} の写真`}
        titleId="daily-photo-title"
        subtitle={
          isLoading ? '読み込み中...' : `${assets?.length || 0} items`
        }
        onBack={onClose}
        backLabel="写真を閉じる"
      />

      {/* ギャラリー */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
        <div className="mx-auto max-w-5xl">
          {isLoading ? (
            <div className="trails-card p-10 text-center text-sm text-gray-500 animate-pulse">
              写真を読み込んでいます...
            </div>
          ) : assets?.length ? (
            <div className="trails-card p-4 md:p-5">
              <AssetGrid assets={assets} isLoading={false} />
            </div>
          ) : (
            <div className="trails-card p-10 text-center text-sm text-gray-400">
              この日の写真はありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
