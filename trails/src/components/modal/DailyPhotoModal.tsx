'use client';

import React from 'react';
import { X } from 'lucide-react';
import AssetGrid from '@/components/ui/AssetGrid';
import { useAssetSearch } from '@/hooks/useAssetSearch'; // Vistaから移植したSWRフック

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
  // isOpen が false、または date が無い時はフェッチをスキップ (キャッシュがあれば即時レンダリング)
  const { assets, isLoading } = useAssetSearch(
    isOpen && date ? { date } : null,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-full duration-300">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{date} の記録</h2>
          <p className="text-xs text-slate-500">{assets?.length || 0} items</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ギャラリー */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            Loading photos...
          </div>
        ) : assets?.length ? (
          <AssetGrid assets={assets} isLoading={false} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            この日の写真はありません
          </div>
        )}
      </div>
    </div>
  );
}
