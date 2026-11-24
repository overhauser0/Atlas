'use client';

import { Tags } from 'lucide-react';
import type { DiaryItem, Views } from '@/types';
import { formatJaDateWithWeekday } from '@atlas/shared/date';
import type {
  YearDiarySummary,
  YearPhotoSummary,
} from './computeYearReview';

interface DiaryPhotoHighlightsProps {
  selectedYear: number;
  diarySummary: YearDiarySummary;
  photoSummary: YearPhotoSummary;
  topKeywords: [string, number][];
  isDiariesLoading: boolean;
  diariesError: boolean;
  isImmichLoading: boolean;
  onRetryDiaries: () => void;
  onDiaryClick: (diary: DiaryItem) => void;
  onNavigate: (tab: Views) => void;
  onOpenDailyPhoto: (date: string) => void;
}

const getHeatmapColor = (count: number) => {
  if (count === 0) return 'bg-gray-100';
  if (count <= 5) return 'bg-emerald-200';
  if (count <= 15) return 'bg-emerald-300';
  if (count <= 30) return 'bg-emerald-400';
  return 'bg-emerald-500';
};

export default function DiaryPhotoHighlights({
  selectedYear,
  diarySummary,
  photoSummary,
  topKeywords,
  isDiariesLoading,
  diariesError,
  isImmichLoading,
  onRetryDiaries,
  onDiaryClick,
  onNavigate,
  onOpenDailyPhoto,
}: DiaryPhotoHighlightsProps) {
  return (
    <>
      {/* Diary ハイライト */}
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Diary Reflections
            </p>
            <h2 className="text-lg font-bold text-gray-900">日記ハイライト</h2>
          </div>
          {diarySummary.avgRate !== null && (
            <div className="text-right">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                平均 ★ {diarySummary.avgRate.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {isDiariesLoading ? (
          <div className="py-10 text-center text-sm text-gray-400 animate-pulse">
            日記データを読み込み中...
          </div>
        ) : diariesError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500 mb-3">
              日記データの取得に失敗しました
            </p>
            <button
              type="button"
              onClick={onRetryDiaries}
              className="text-xs font-bold text-primary-600 hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : diarySummary.recordedCount === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {selectedYear}年の日記記録はありません
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-2.5">
              <p className="text-xs font-bold text-gray-500 mb-3">
                Rate 分布（{diarySummary.ratedCount}件）
              </p>
              {[5, 4, 3, 2, 1].map((rate) => {
                const count = diarySummary.rateCounts[rate] || 0;
                const pct =
                  diarySummary.ratedCount > 0
                    ? Math.round((count / diarySummary.ratedCount) * 100)
                    : 0;
                return (
                  <div key={rate} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-bold text-amber-500 shrink-0">
                      ★{rate}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-gray-500 tabular-nums shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-8">
              <p className="text-xs font-bold text-gray-500 mb-3">Best Days</p>
              {diarySummary.highlights.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  表示対象の日記はありません
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diarySummary.highlights.map((diary) => (
                    <button
                      key={diary.date}
                      type="button"
                      onClick={() => onDiaryClick(diary)}
                      className="text-left p-4 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-primary-50/40 hover:border-primary-200 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {formatJaDateWithWeekday(diary.date, 'short')}
                        </span>
                        {diary.rate && (
                          <span className="text-[11px] font-bold text-amber-500">
                            {'★'.repeat(diary.rate)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                        {diary.content.trim() || '（テキストなし）'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Photo ハイライト (Immich) */}
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Immich Memories
            </p>
            <h2 className="text-lg font-bold text-gray-900">写真ハイライト</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('Photo')}
            className="text-xs font-bold text-primary-600 hover:text-primary-700"
          >
            Immich を見る →
          </button>
        </div>

        {isImmichLoading ? (
          <div className="py-8 text-center text-sm text-gray-400 animate-pulse">
            写真統計を読み込み中...
          </div>
        ) : photoSummary.totalPhotos === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {selectedYear}年の撮影データはありません
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500">
                  {selectedYear} 撮影ヒートマップ
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span>Less</span>
                  <span className="w-2.5 h-2.5 rounded-xs bg-gray-100" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span>More</span>
                </div>
              </div>
              <div className="overflow-x-auto no-scrollbar pb-1">
                <div className="w-max">
                  <div className="grid grid-rows-7 grid-flow-col gap-1">
                    {photoSummary.heatmapCells.map((cell, idx) =>
                      cell === null ? (
                        <div key={`blank-${idx}`} className="w-2.5 h-2.5" />
                      ) : (
                        <button
                          key={cell.date}
                          type="button"
                          title={`${cell.date}: ${cell.count} photos`}
                          onClick={() =>
                            cell.count > 0 && onOpenDailyPhoto(cell.date)
                          }
                          className={`w-2.5 h-2.5 rounded-xs transition-transform ${
                            cell.count > 0
                              ? 'hover:scale-125 cursor-pointer'
                              : 'cursor-default'
                          } ${getHeatmapColor(cell.count)}`}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {photoSummary.topPhotoDays.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-3">
                  一番写真を撮った日 Top {photoSummary.topPhotoDays.length}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {photoSummary.topPhotoDays.map((day, idx) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => onOpenDailyPhoto(day.date)}
                      className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 w-5 h-5 rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-800">
                          {formatJaDateWithWeekday(day.date, 'short')}
                        </span>
                      </div>
                      <span className="text-sm font-black text-gray-900 sm:mt-1 tabular-nums">
                        {day.count.toLocaleString()}
                        <span className="text-[11px] font-medium text-gray-400 ml-0.5">
                          枚
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* キーワード (fkw) */}
      {topKeywords.length > 0 && (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                Keywords
              </p>
              <h2 className="text-lg font-bold text-gray-900 leading-none">
                {selectedYear}年のキーワード
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {topKeywords.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                <span>#{tag}</span>
                {count > 1 && (
                  <span className="text-[10px] font-bold text-gray-400">
                    ×{count}
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
