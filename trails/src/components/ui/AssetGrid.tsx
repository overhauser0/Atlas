'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import AuthImage from './AuthImage';

export interface Asset {
  id: string;
  originalFileName?: string;
  localDateTime?: string;
  thumbhash?: string | null;
  exif?: {
    make?: string | null;
    model?: string | null;
    focalLength?: number | null;
  } | null;
}

interface AssetGridProps {
  assets: Asset[];
  isLoading?: boolean;
  /** true: 折り返しグリッド一覧（デフォルト） / false: 1行横スクロール */
  wrap?: boolean;
  /** 空状態メッセージのカスタマイズ用（falseで空表示自体を隠す） */
  emptyMessage?: string | false;
}

const IMMICH_BASE_URL =
  process.env.NEXT_PUBLIC_IMMICH_URL?.trim().replace(/\/+$/, '') || '';

function formatLocalAssetTime(localDateTime?: string): string {
  if (!localDateTime) return '';
  const match = localDateTime.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  try {
    return new Date(localDateTime).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function AssetGrid({
  assets,
  isLoading,
  wrap = true,
  emptyMessage = 'No assets found for this date.',
}: AssetGridProps) {
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  // プレビュー表示中のEscapeキーは親モーダル（DiaryModal等）に伝播させずプレビューだけ閉じる
  useEffect(() => {
    if (!previewAsset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPreviewAsset(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [previewAsset]);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-gray-500 animate-pulse">
        Loading assets...
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    if (emptyMessage === false) return null;
    return (
      <div className="py-12 text-center text-gray-400">{emptyMessage}</div>
    );
  }

  const containerClass = wrap
    ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2'
    : 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar';

  const itemClass = wrap
    ? 'relative group aspect-square rounded-xl overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
    : 'relative group shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <>
      <div className={containerClass}>
        {assets.map((asset) => {
          const timeStr = formatLocalAssetTime(asset.localDateTime);
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => setPreviewAsset(asset)}
              className={itemClass}
            >
              <AuthImage
                src={`/immich/assets/${asset.id}/thumbnail`}
                alt={asset.originalFileName || ''}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* 1行スクロール時は撮影時刻バッジを表示 */}
              {!wrap && timeStr && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-mono leading-none text-white bg-black/55 backdrop-blur-xs rounded">
                  {timeStr}
                </span>
              )}

              {/* グリッド表示時はホバーでEXIF情報をオーバーレイ */}
              {wrap && asset.exif?.model && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 text-left">
                  <span className="text-white text-[10px] font-medium truncate">
                    {asset.exif.model}
                  </span>
                  {asset.exif.focalLength && (
                    <span className="text-white/80 text-[10px]">
                      {Math.round(asset.exif.focalLength)}mm
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Photo Lightbox Overlay */}
      {previewAsset && (
        <div
          onClick={() => setPreviewAsset(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex flex-col justify-between p-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-white/75">
              {previewAsset.localDateTime && (
                <span>{formatLocalAssetTime(previewAsset.localDateTime)}</span>
              )}
              {previewAsset.exif?.model && (
                <span className="text-white/50">
                  {previewAsset.localDateTime ? '· ' : ''}
                  {previewAsset.exif.model}
                  {previewAsset.exif.focalLength
                    ? ` (${Math.round(previewAsset.exif.focalLength)}mm)`
                    : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreviewAsset(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-h-0 w-full max-w-2xl mx-auto flex items-center justify-center my-4 overflow-hidden"
          >
            <AuthImage
              src={`/immich/assets/${previewAsset.id}/thumbnail`}
              alt={previewAsset.originalFileName || ''}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>

          {IMMICH_BASE_URL && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex justify-center pb-2 shrink-0"
            >
              <a
                href={`${IMMICH_BASE_URL}/photos/${previewAsset.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors"
              >
                <span>Immichで開く</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
