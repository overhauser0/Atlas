'use client';

import { useState } from 'react';
import {
  Aperture,
  Camera,
  HardDrive,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useImmichStats } from '@/hooks/useImmichStats';
import PhotoHeatmap from '@/components/ui/PhotoHeatmap';

interface PhotoTabProps {
  onDateClick: (date: string) => void;
}

export default function PhotoTab({ onDateClick }: PhotoTabProps) {
  const { stats, isLoading, isError, sync } = useImmichStats();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await sync();
    } catch {
      alert('同期に失敗しました');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full pt-5 px-5 md:pt-8 md:px-8">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500">
              <Aperture className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Photo Library
              </h2>
              <p className="text-sm text-gray-500">
                Your photo library at a glance
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing || isLoading}
            className="shrink-0 flex items-center gap-2 px-3 py-2 md:px-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white text-sm font-bold transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {isSyncing ? 'Syncing...' : 'Sync'}
            </span>
          </button>
        </header>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-1">
          <span>
            Last synced:{' '}
            {stats?.syncedAt
              ? new Date(stats.syncedAt).toLocaleString()
              : 'Never'}
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-sm font-medium text-gray-400 animate-pulse">
            Loading photo library...
          </div>
        ) : isError ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-sm font-medium text-red-500">
            Failed to load photo library statistics.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Total Assets
                  </p>
                  <p className="text-2xl font-black text-gray-900">
                    {stats?.total?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Storage Used
                  </p>
                  <p className="text-2xl font-black text-gray-900">
                    {stats?.storage?.usedGb || 0}
                    <span className="ml-1 text-sm font-bold text-gray-400">
                      GB
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Shooting Activity
              </h3>
              <PhotoHeatmap
                dailyCounts={stats?.dailyCounts}
                onDateClick={onDateClick}
              />
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
                  Top Camera Makes
                </h3>
                <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar pr-1">
                  {stats?.topMakes?.length ? (
                    stats.topMakes.map((item, i) => {
                      const maxCount = Math.max(
                        stats.topMakes[0]?.count || 1,
                        1,
                      );
                      const percent = Math.round(
                        (item.count / maxCount) * 100,
                      );
                      return (
                        <div key={`${item.name}-${i}`}>
                          <div className="flex justify-between gap-3 text-xs mb-1.5">
                            <span
                              className="font-semibold text-gray-700 truncate"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                            <span className="shrink-0 text-gray-400 font-mono">
                              {item.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-8">
                      No make data available.
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
                  Top Camera Models
                </h3>
                <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar pr-1">
                  {stats?.topModels?.length ? (
                    stats.topModels.map((item, i) => {
                      const maxCount = Math.max(
                        stats.topModels[0]?.count || 1,
                        1,
                      );
                      const percent = Math.round(
                        (item.count / maxCount) * 100,
                      );
                      return (
                        <div key={`${item.name}-${i}`}>
                          <div className="flex justify-between gap-3 text-xs mb-1.5">
                            <span
                              className="font-semibold text-gray-700 truncate"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                            <span className="shrink-0 text-gray-400 font-mono">
                              {item.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-8">
                      No model data available.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-4 h-4 text-primary-500" />
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Top Locations
                </h3>
                <span className="text-[10px] font-medium text-gray-300">
                  State / Region
                </span>
              </div>
              <div className="space-y-4">
                {stats?.topStates && stats.topStates.length > 0 ? (
                  (() => {
                    const maxStateCount = Math.max(
                      ...stats.topStates.map((item) => item.count),
                      1,
                    );
                    return stats.topStates.map((item, i) => {
                      const percent = Math.round(
                        (item.count / maxStateCount) * 100,
                      );
                      return (
                        <div key={`${item.name}-${i}`}>
                          <div className="flex justify-between gap-3 text-xs mb-1.5">
                            <span
                              className="font-semibold text-gray-700 truncate"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                            <span className="shrink-0 text-gray-400 font-mono">
                              {item.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="text-sm text-gray-400 text-center py-8">
                    No location data available.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
                Top Focal Lengths
              </h3>
              {stats?.topFocalLengths?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {stats.topFocalLengths.map((item, i) => (
                    <div
                      key={`${item.name}-${i}`}
                      className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col justify-between"
                    >
                      <span className="text-lg font-bold text-gray-800">
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold text-primary-600 mt-2">
                        {item.count.toLocaleString()} items
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">
                  No focal length data available.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
