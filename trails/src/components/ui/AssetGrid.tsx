// src/components/ui/AssetGrid.tsx
'use client';

import React from 'react';
import AuthImage from './AuthImage';

interface Asset {
  id: string;
  originalFileName: string;
  exif: { model?: string; focalLength?: number } | null;
}

interface AssetGridProps {
  assets: Asset[];
  isLoading?: boolean;
}

export default function AssetGrid({ assets, isLoading }: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-500 animate-pulse">
        Loading assets...
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No assets found for this date.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800"
        >
          <AuthImage
            src={`/immich/assets/${asset.id}/thumbnail`}
            alt={asset.originalFileName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {asset.exif?.model && (
            <div className="absolute inset-0 bg-liner-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
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
        </div>
      ))}
    </div>
  );
}
