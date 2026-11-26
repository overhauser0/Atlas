'use client';

import { useEffect } from 'react';
import { Camera } from 'lucide-react';
import AssetGrid from '@/components/ui/AssetGrid';
import PageHeader from '@/components/ui/PageHeader';
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
      className="fixed inset-0 z-[60] bg-gray-100 animate-in fade-in duration-150"
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
        <PageHeader
          icon={<Camera />}
          title={`${personName}の写真`}
          titleId="person-photo-title"
          subtitle={isLoading ? '読み込み中...' : `${assets?.length ?? 0} items`}
          onBack={onClose}
          backLabel="写真を閉じる"
        />

        <div className="min-h-0 flex-1 overflow-y-auto pb-12 no-scrollbar">
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
