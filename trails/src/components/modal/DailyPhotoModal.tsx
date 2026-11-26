'use client';

import React, { useEffect } from 'react';
import { Aperture } from 'lucide-react';
import AssetGrid from '@/components/ui/AssetGrid';
import PageHeader from '@/components/ui/PageHeader';
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
      className="fixed inset-0 z-50 bg-gray-100 animate-in fade-in duration-150"
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
        <PageHeader
          icon={<Aperture />}
          title={`${date ?? ''} の写真`}
          titleId="daily-photo-title"
          subtitle={
            isLoading ? '読み込み中...' : `${assets?.length || 0} items`
          }
          onBack={onClose}
          backLabel="写真を閉じる"
        />

        {/* ギャラリー */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-12 no-scrollbar">
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
