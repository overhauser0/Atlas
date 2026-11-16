'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { DiaryItem } from '@/types';
import { atlasFetch } from '@/utils/api';
import AssetGrid, { Asset } from '@/components/ui/AssetGrid';

export interface SparkItem {
  id: string;
  content: string;
  recorded_at: string;
  target_date: string;
  discord_message_id?: string | null;
  consumed_at?: string | null;
}

export interface ImmichAssetItem {
  id: string;
  thumbhash?: string | null;
  originalFileName?: string;
  localDateTime?: string;
  exif?: {
    make?: string | null;
    model?: string | null;
    focalLength?: number | null;
  } | null;
}

interface DiaryModalProps {
  isOpen: boolean;
  diary: DiaryItem | null;
  onClose: () => void;
}

const RATES = [1, 2, 3, 4, 5];
const IMMICH_BASE_URL =
  process.env.NEXT_PUBLIC_IMMICH_URL || 'https://immich.piova.app';

// 通常のUTC/ISO文字列用（Sparkのrecorded_atなど）
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

// ImmichのlocalDateTime用（すでにローカル時刻のため、タイムゾーン二重変換を防ぐ）
function formatLocalAssetTime(localDateTime?: string): string {
  if (!localDateTime) return '';
  const match = localDateTime.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return formatTime(localDateTime);
}

// atlasFetch経由でImmichのサムネイルを描画するコンポーネント
function ImmichThumbnail({
  assetId,
  alt = '',
  className = '',
}: {
  assetId: string;
  alt?: string;
  className?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let currentUrl: string | null = null;

    (async () => {
      try {
        const res = await atlasFetch(`/immich/assets/${assetId}/thumbnail`);
        if (!res.ok || isCancelled) return;
        const blob = await res.blob();
        if (isCancelled) return;
        currentUrl = URL.createObjectURL(blob);
        setObjectUrl(currentUrl);
      } catch (e) {
        console.error('Failed to load Immich thumbnail', e);
      }
    })();

    return () => {
      isCancelled = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [assetId]);

  if (!objectUrl) {
    return <div className={`bg-gray-100 animate-pulse ${className}`} />;
  }

  return <img src={objectUrl} alt={alt} loading="lazy" className={className} />;
}

export default function DiaryModal({
  isOpen,
  diary,
  onClose,
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
  const [previewPhoto, setPreviewPhoto] = useState<ImmichAssetItem | null>(
    null,
  );

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

  // 画面オープン時の初期化 & Sparks・Immich当日写真の並列取得
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
    setPreviewPhoto(null);

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

    // 2. Immich当日写真の取得（既存の POST /immich/search を使用）
    (async () => {
      try {
        const res = await atlasFetch('/immich/search', {
          method: 'POST',
          body: JSON.stringify({ date: diary.date }),
        });
        if (!res.ok || isCancelled) return;
        const json = await res.json();
        const items: ImmichAssetItem[] = Array.isArray(json)
          ? json
          : (json.data ?? []);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (previewPhoto) {
          setPreviewPhoto(null);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, previewPhoto, handleClose]);

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
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in fade-in duration-150">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 shrink-0 bg-gray-50/80 backdrop-blur-md border-b border-gray-200/70">
        <div className="w-full px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-1.5 pr-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              {formData.date}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-gray-400">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={() => persistDiary(latestDataRef.current)}
                className="text-red-600 font-medium underline"
              >
                Retry Save
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: スマホは縦1カラム、md以上は左(情報)・右(テキスト)の2ペイン */}
      <main className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col">
        {saveError && (
          <div className="px-4 md:px-6 pt-4 shrink-0">
            <div
              role="alert"
              className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600"
            >
              {saveError}
            </div>
          </div>
        )}

        <div className="w-full flex-1 md:h-full grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-5 p-4 md:p-6 pb-12 md:pb-6 md:overflow-hidden">
          {/* 左ペイン：メタデータ・写真・Sparks・関連Piece */}
          <div className="md:col-span-5 lg:col-span-4 space-y-3 md:overflow-y-auto md:pr-1">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3">
              <section className="col-span-2 bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Rate
                  </span>
                  {formData.rate && (
                    <span className="text-xs font-medium text-gray-500">
                      {formData.rate} / 5
                    </span>
                  )}
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
                        className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-gray-50/70 text-gray-600 border-gray-200/80 hover:bg-gray-100'
                        }`}
                      >
                        {'★'.repeat(rate)}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Immich Daily Photos Bento Card */}
            {photos.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Photos ({photos.length})
                  </span>
                </div>

                <AssetGrid assets={photos} wrap={false} emptyMessage={false} />
              </section>
            )}

            {/* Sparks Bento Card */}
            {sparks.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Sparks ({sparks.length})
                    </span>
                  </div>
                  {sparks.length > 1 && (
                    <button
                      type="button"
                      onClick={handlePromoteAllSparks}
                      className="text-xs font-semibold text-gray-900 hover:text-gray-600 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200/70 transition-colors"
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
                          className="p-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
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

            {/* Linked Pieces Slot */}
            {formData.piece_ids && formData.piece_ids.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Linked Pieces ({formData.piece_ids.length})
                </span>
                <p className="text-xs text-gray-500">
                  {formData.piece_ids.length} 件の Piece が紐づいています
                </p>
              </section>
            )}
          </div>

          {/* 右ペイン：Main Note (Markdown) Bento Card */}
          <section className="md:col-span-7 lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 p-4 md:p-6 shadow-xs flex flex-col md:h-full">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <label
                htmlFor="diary-note-textarea"
                className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider"
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
              className="w-full flex-1 min-h-[320px] md:min-h-0 text-sm md:text-base leading-relaxed text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none resize-y md:resize-none"
            />
          </section>
        </div>
      </main>

      {/* Photo Lightbox Overlay */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex flex-col justify-between p-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 text-xs font-mono text-white/75">
              <span>{formatLocalAssetTime(previewPhoto.localDateTime)}</span>
              {previewPhoto.exif?.model && (
                <span className="text-white/50">
                  · {previewPhoto.exif.model}
                  {previewPhoto.exif.focalLength
                    ? ` (${previewPhoto.exif.focalLength}mm)`
                    : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center my-4 overflow-hidden"
          >
            <ImmichThumbnail
              assetId={previewPhoto.id}
              alt={previewPhoto.originalFileName || ''}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex justify-center pb-2"
          >
            <a
              href={`${IMMICH_BASE_URL}/photos/${previewPhoto.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors"
            >
              <span>Immichで開く</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
