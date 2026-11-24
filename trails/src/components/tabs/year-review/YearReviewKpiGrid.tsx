'use client';

import {
  Calendar,
  Camera,
  MapPin,
  Notebook,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  YearDiarySummary,
  YearItemSummary,
  YearPhotoSummary,
} from './computeYearReview';

interface YearReviewKpiGridProps {
  itemSummary: YearItemSummary;
  diarySummary: YearDiarySummary;
  photoSummary: YearPhotoSummary;
  isDiariesLoading: boolean;
  isImmichLoading: boolean;
}

export default function YearReviewKpiGrid({
  itemSummary,
  diarySummary,
  photoSummary,
  isDiariesLoading,
  isImmichLoading,
}: YearReviewKpiGridProps) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Events */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500">
            <Calendar className="w-5 h-5" />
          </div>
          {itemSummary.prevYearEventCount > 0 && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                itemSummary.eventDiff > 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : itemSummary.eventDiff < 0
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {itemSummary.eventDiff > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : itemSummary.eventDiff < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {itemSummary.eventDiff > 0
                ? `+${itemSummary.eventDiff}`
                : itemSummary.eventDiff === 0
                  ? '±0'
                  : itemSummary.eventDiff}
            </span>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Events
          </p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
            {itemSummary.yearEventCount}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            完了タスク {itemSummary.yearDoneTaskCount}件
          </p>
        </div>
      </div>

      {/* Prefectures */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
            <MapPin className="w-5 h-5" />
          </div>
          {itemSummary.hasPriorPrefHistory &&
            itemSummary.firstTimePrefs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600">
                初訪問 +{itemSummary.firstTimePrefs.length}
              </span>
            )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Prefectures
          </p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
            {itemSummary.visitedPrefsCount}
            <span className="text-sm font-bold text-gray-400 ml-1">/ 47</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">訪れた都道府県</p>
        </div>
      </div>

      {/* Diary */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <Notebook className="w-5 h-5" />
          </div>
          {diarySummary.avgRate !== null && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {diarySummary.avgRate.toFixed(1)}
            </span>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Diary
          </p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
            {isDiariesLoading ? '-' : diarySummary.recordedCount}
            <span className="text-sm font-bold text-gray-400 ml-1">日</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {diarySummary.ratedCount > 0
              ? `評価済み ${diarySummary.ratedCount}日`
              : '記録日数'}
          </p>
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
            <Camera className="w-5 h-5" />
          </div>
          {photoSummary.shootingDays > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
              {photoSummary.shootingDays}日撮影
            </span>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Photos
          </p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
            {isImmichLoading ? '-' : photoSummary.totalPhotos.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Immich 年間撮影数</p>
        </div>
      </div>
    </section>
  );
}
