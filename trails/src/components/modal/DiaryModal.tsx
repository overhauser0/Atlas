'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { DiaryItem, LifeItem } from '@/types';
import { atlasFetch } from '@/utils/api';
import { getDateFullString } from '@/utils/dateUtils';
import AssetGrid, { Asset } from '@/components/ui/AssetGrid';
import FullscreenHeader from '@/components/ui/FullscreenHeader';
import ListItem from '@/components/ui/ListItem';

export interface SparkItem {
  id: string;
  content: string;
  recorded_at: string;
  target_date: string;
  discord_message_id?: string | null;
  consumed_at?: string | null;
}

interface DiaryModalProps {
  isOpen: boolean;
  diary: DiaryItem | null;
  lifeItems: LifeItem[];
  onClose: () => void;
  onChangeDate?: (date: string) => void | Promise<void>;
  onSelectLifeItem?: (item: LifeItem) => void;
}

const RATES = [1, 2, 3, 4, 5];

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// タイムゾーンズレを防ぐ YYYY-MM-DD の日付加減算ヘルパー
function shiftDate(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDiaryDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${y}年${m}月${d}日 (${weekday})`;
}

export default function DiaryModal({
  isOpen,
  diary,
  lifeItems,
  onClose,
  onChangeDate,
  onSelectLifeItem,
}: DiaryModalProps) {
  const [formData, setFormData] = useState<DiaryItem>({
    date: '',
    rate: null,
    content: '',
    flag: false,
    piece_ids: [],
  });
  const [sparks, setSparks] = useState<SparkItem[]>([]);
  const [photos, setPhotos] = useState<Asset[]>([]);

  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [saveError, setSaveError] = useState('');

  const latestDataRef = useRef<DiaryItem>(formData);
  const isDirtyRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    latestDataRef.current = formData;
  }, [formData]);

  const persistDiary = useCallback(async (dataToSave: DiaryItem) => {
    if (!dataToSave.date) return;
    setSaveStatus('saving');
    setSaveError('');

    const payload = {
      date: dataToSave.date,
      rate: dataToSave.rate,
      content: dataToSave.content,
      flag: dataToSave.flag,
      piece_ids: dataToSave.piece_ids,
    };

    try {
      const res = await atlasFetch('/diaries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message || 'Failed to save diary');
      }

      isDirtyRef.current = false;
      setSaveStatus('saved');
    } catch (e) {
      console.error('Save failed', e);
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : 'Failed to save diary');
    }
  }, []);

  const updateFormAndScheduleSave = useCallback(
    (updater: (prev: DiaryItem) => DiaryItem, immediate = false) => {
      setFormData((prev) => {
        const next = updater(prev);
        latestDataRef.current = next;
        isDirtyRef.current = true;

        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }

        if (immediate) {
          persistDiary(next);
        } else {
          setSaveStatus('idle');
          saveTimerRef.current = setTimeout(() => {
            persistDiary(next);
          }, 800);
        }

        return next;
      });
    },
    [persistDiary],
  );

  // 画面オープン時・日付変更時の初期化 & Sparks・Immich写真の並列取得
  useEffect(() => {
    if (!isOpen || !diary) return;

    const initial: DiaryItem = {
      ...diary,
      rate: diary.rate ?? null,
      content: diary.content ?? '',
      flag: diary.flag ?? false,
      piece_ids: diary.piece_ids ?? [],
    };

    setFormData(initial);
    latestDataRef.current = initial;
    isDirtyRef.current = false;
    setSaveStatus('idle');
    setSaveError('');
    setSparks([]);
    setPhotos([]);

    let isCancelled = false;

    // 1. 未消化Sparkの取得
    (async () => {
      try {
        const res = await atlasFetch(`/sparks?targetDate=${diary.date}`);
        if (!res.ok || isCancelled) return;
        const json = await res.json();
        const items: SparkItem[] = Array.isArray(json)
          ? json
          : (json.data ?? []);
        if (!isCancelled) setSparks(items);
      } catch (e) {
        console.error('Failed to fetch sparks', e);
      }
    })();

    // 2. Immich当日写真の取得
    (async () => {
      try {
        const res = await atlasFetch('/immich/search', {
          method: 'POST',
          body: JSON.stringify({ date: diary.date }),
        });
        if (!res.ok || isCancelled) return;
        const json = await res.json();
        const items: Asset[] = Array.isArray(json) ? json : (json.data ?? []);

        const sorted = [...items].sort((a, b) =>
          (a.localDateTime ?? '').localeCompare(b.localDateTime ?? ''),
        );

        if (!isCancelled) setPhotos(sorted);
      } catch (e) {
        console.error('Failed to fetch Immich photos', e);
      }
    })();

    return () => {
      isCancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isOpen, diary]);

  const handleClose = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (isDirtyRef.current) {
      await persistDiary(latestDataRef.current);
    }
    onClose();
  }, [onClose, persistDiary]);

  // 指定日への移動（未保存分があれば保存してから親へ通知）
  const handleSelectDate = useCallback(
    async (targetDate: string) => {
      if (!targetDate || !onChangeDate || targetDate === formData.date) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (isDirtyRef.current) {
        await persistDiary(latestDataRef.current);
      }
      try {
        await onChangeDate(targetDate);
      } catch (e) {
        console.error('Failed to change diary date', e);
        setSaveStatus('error');
        setSaveError(
          e instanceof Error ? e.message : 'Failed to change diary date',
        );
      }
    },
    [formData.date, onChangeDate, persistDiary],
  );

  const handleNavigateDate = useCallback(
    (days: number) => {
      if (!formData.date) return;
      void handleSelectDate(shiftDate(formData.date, days));
    },
    [formData.date, handleSelectDate],
  );

  const handleGoToToday = useCallback(() => {
    void handleSelectDate(getDateFullString(new Date(), 'hyphen'));
  }, [handleSelectDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handlePromoteSpark = async (spark: SparkItem) => {
    const timeLabel = formatTime(spark.recorded_at);
    const formattedLine = timeLabel
      ? `- **${timeLabel}** ${spark.content}`
      : `- ${spark.content}`;

    setSparks((prev) => prev.filter((s) => s.id !== spark.id));
    updateFormAndScheduleSave((prev) => {
      const trimmed = prev.content.trimEnd();
      const nextContent = trimmed
        ? `${trimmed}\n${formattedLine}`
        : formattedLine;
      return { ...prev, content: nextContent };
    }, true);

    try {
      await atlasFetch(`/sparks/${spark.id}/consume`, { method: 'PATCH' });
    } catch (e) {
      console.error('Failed to consume spark', e);
    }
  };

  const handleDismissSpark = async (sparkId: string) => {
    setSparks((prev) => prev.filter((s) => s.id !== sparkId));
    try {
      await atlasFetch(`/sparks/${sparkId}/consume`, { method: 'PATCH' });
    } catch (e) {
      console.error('Failed to dismiss spark', e);
    }
  };

  const handlePromoteAllSparks = async () => {
    if (sparks.length === 0) return;
    const targetIds = sparks.map((s) => s.id);
    const lines = sparks.map((s) => {
      const timeLabel = formatTime(s.recorded_at);
      return timeLabel ? `- **${timeLabel}** ${s.content}` : `- ${s.content}`;
    });

    setSparks([]);
    updateFormAndScheduleSave((prev) => {
      const trimmed = prev.content.trimEnd();
      const block = lines.join('\n');
      const nextContent = trimmed ? `${trimmed}\n${block}` : block;
      return { ...prev, content: nextContent };
    }, true);

    try {
      await atlasFetch('/sparks/consume-bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: targetIds }),
      });
    } catch (e) {
      console.error('Failed to bulk consume sparks', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-in fade-in duration-150">
      <FullscreenHeader
        title="日記"
        subtitle={formatDiaryDateLabel(formData.date)}
        onBack={handleClose}
        backLabel="戻る"
        actions={
          <>
            <div className="flex items-center text-xs">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  type="button"
                  onClick={() => persistDiary(latestDataRef.current)}
                  className="text-red-600 font-semibold underline"
                >
                  Retry
                </button>
              )}
            </div>

            {onChangeDate && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoToToday}
                  disabled={saveStatus === 'saving'}
                  className="trails-nav-btn"
                >
                  今日
                </button>
                <button
                  type="button"
                  aria-label="前の日"
                  onClick={() => handleNavigateDate(-1)}
                  disabled={saveStatus === 'saving'}
                  className="trails-nav-icon-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="次の日"
                  onClick={() => handleNavigateDate(1)}
                  disabled={saveStatus === 'saving'}
                  className="trails-nav-icon-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col">
        {saveError && (
          <div className="px-4 md:px-6 pt-4 shrink-0">
            <div
              role="alert"
              className="px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600"
            >
              {saveError}
            </div>
          </div>
        )}

        <div className="w-full flex-1 md:h-full grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 p-4 md:p-6 pb-12 md:pb-6 md:overflow-hidden">
          {/* 左ペイン：メタデータ・本日のLifeItem・写真・Sparks */}
          <div className="md:col-span-5 lg:col-span-4 space-y-4 md:overflow-y-auto no-scrollbar md:pr-1">
            {/* Rate & Flag Card */}
            <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Rate
                  </span>
                  {formData.rate && (
                    <span className="text-xs font-bold text-primary-600">
                      {formData.rate} / 5
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  aria-pressed={Boolean(formData.flag)}
                  onClick={() =>
                    updateFormAndScheduleSave(
                      (prev) => ({ ...prev, flag: !prev.flag }),
                      true,
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    formData.flag
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Flag
                    className={`h-3 w-3 ${formData.flag ? 'fill-rose-500 text-rose-500' : ''}`}
                  />
                  <span>Pick</span>
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {RATES.map((rate) => {
                  const isSelected = formData.rate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() =>
                        updateFormAndScheduleSave(
                          (prev) => ({
                            ...prev,
                            rate: prev.rate === rate ? null : rate,
                          }),
                          true,
                        )
                      }
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                          : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
                      }`}
                    >
                      {'★'.repeat(rate)}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 本日の LifeItem Bento Card */}
            {lifeItems.length > 0 && (
              <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Life Items ({lifeItems.length})
                  </span>
                </div>

                <div className="divide-y divide-gray-100 -mx-2">
                  {lifeItems.map((item) => (
                    <ListItem
                      key={item.id}
                      item={item}
                      slim
                      onItemClick={() => onSelectLifeItem?.(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Immich Daily Photos Bento Card */}
            {photos.length > 0 && (
              <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Photos ({photos.length})
                  </span>
                </div>

                <AssetGrid assets={photos} wrap={false} emptyMessage={false} />
              </section>
            )}

            {/* Sparks Bento Card */}
            {sparks.length > 0 && (
              <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Sparks ({sparks.length})
                    </span>
                  </div>
                  {sparks.length > 1 && (
                    <button
                      type="button"
                      onClick={handlePromoteAllSparks}
                      className="text-xs font-bold text-primary-700 hover:bg-primary-100 px-2.5 py-1 rounded-lg bg-primary-50 transition-colors"
                    >
                      すべて追記
                    </button>
                  )}
                </div>

                <ul className="divide-y divide-gray-100">
                  {sparks.map((spark) => (
                    <li
                      key={spark.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-gray-400 mr-2">
                          {formatTime(spark.recorded_at)}
                        </span>
                        <span className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                          {spark.content}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePromoteSpark(spark)}
                          title="Noteに追記"
                          className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissSpark(spark.id)}
                          title="破棄"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* 右ペイン：Main Note (Markdown) Bento Card */}
          <section className="md:col-span-7 lg:col-span-8 bg-white rounded-3xl border border-gray-100 p-5 md:p-6 shadow-sm flex flex-col md:h-full">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <label
                htmlFor="diary-note-textarea"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
              >
                Note (Markdown)
              </label>
            </div>
            <textarea
              id="diary-note-textarea"
              value={formData.content}
              onChange={(e) =>
                updateFormAndScheduleSave((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
              placeholder="How was your day?"
              className="w-full flex-1 min-h-[320px] md:min-h-0 text-sm md:text-base leading-relaxed text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none resize-y md:resize-none trails-scrollbar"
            />
          </section>
        </div>
      </main>
    </div>
  );
}
