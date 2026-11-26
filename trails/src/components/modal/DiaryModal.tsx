'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Calendar,
  Camera,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  ListTodo,
  Loader2,
  Notebook,
  PenLine,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { DiaryItem, LifeItem } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import {
  formatJaDateWithWeekday,
  formatTimeFromIso,
  getDateFullString,
  shiftDateKey,
} from '@atlas/shared/date';
import { getChecklistStats, toggleChecklistLine } from '@atlas/shared/markdown';
import AssetGrid, { Asset } from '@/components/ui/AssetGrid';
import PageHeader from '@/components/ui/PageHeader';
import ListItem from '@/components/ui/ListItem';
import MarkdownPreview from '@/components/ui/MarkdownPreview';

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

const RATE_OPTIONS: {
  value: number | null;
  label: string;
  stars: string;
  dotColor: string;
}[] = [
  { value: 5, label: '5 / 5', stars: '★★★★★', dotColor: 'bg-primary-500' },
  { value: 4, label: '4 / 5', stars: '★★★★☆', dotColor: 'bg-emerald-500' },
  { value: 3, label: '3 / 5', stars: '★★★☆☆', dotColor: 'bg-sky-500' },
  { value: 2, label: '2 / 5', stars: '★★☆☆☆', dotColor: 'bg-orange-400' },
  { value: 1, label: '1 / 5', stars: '★☆☆☆☆', dotColor: 'bg-rose-400' },
  { value: null, label: '未設定', stars: '', dotColor: 'bg-gray-300' },
];

const getRateOption = (rate: number | null) =>
  RATE_OPTIONS.find((option) => option.value === rate) ??
  RATE_OPTIONS[RATE_OPTIONS.length - 1];

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
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('edit');
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false);
  const rateMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const checklistStats = useMemo(
    () => getChecklistStats(formData.content),
    [formData.content],
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
    setIsRateMenuOpen(false);
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

  // WebSocketのREFRESH_SPARKSを受信したら当日のSparksを再取得
  useEffect(() => {
    if (!isOpen || !formData.date) return;
    let isCancelled = false;

    const handleRefreshSparks = async () => {
      try {
        const res = await atlasFetch(`/sparks?targetDate=${formData.date}`);
        if (!res.ok || isCancelled) return;
        const json = await res.json();
        const items: SparkItem[] = Array.isArray(json)
          ? json
          : (json.data ?? []);
        if (!isCancelled) setSparks(items);
      } catch (e) {
        console.error('Failed to refresh sparks', e);
      }
    };

    const listener = () => {
      void handleRefreshSparks();
    };
    window.addEventListener('refresh_sparks', listener);
    return () => {
      isCancelled = true;
      window.removeEventListener('refresh_sparks', listener);
    };
  }, [isOpen, formData.date]);

  // Rateドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        rateMenuRef.current &&
        !rateMenuRef.current.contains(event.target as Node)
      ) {
        setIsRateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      void handleSelectDate(shiftDateKey(formData.date, days));
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
        if (isRateMenuOpen) {
          setIsRateMenuOpen(false);
          return;
        }
        handleClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setNoteMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, isRateMenuOpen]);

  const handlePromoteSpark = async (spark: SparkItem) => {
    const timeLabel = formatTimeFromIso(spark.recorded_at);
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
      const timeLabel = formatTimeFromIso(s.recorded_at);
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

  const handleToggleChecklist = useCallback(
    (lineIndex: number) => {
      updateFormAndScheduleSave((prev) => ({
        ...prev,
        content: toggleChecklistLine(prev.content, lineIndex),
      }), true);
    },
    [updateFormAndScheduleSave],
  );

  const handleInsertChecklist = useCallback(() => {
    const el = textareaRef.current;
    const current = latestDataRef.current.content;
    if (!el) {
      updateFormAndScheduleSave((prev) => ({
        ...prev,
        content: prev.content ? `${prev.content.trimEnd()}\n- [ ] ` : '- [ ] ',
      }));
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const prefix =
      start > 0 && current[start - 1] !== '\n' ? '\n- [ ] ' : '- [ ] ';
    const nextContent = `${current.slice(0, start)}${prefix}${current.slice(end)}`;
    updateFormAndScheduleSave((prev) => ({ ...prev, content: nextContent }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length;
      el.setSelectionRange(cursor, cursor);
    });
  }, [updateFormAndScheduleSave]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diary-modal-title"
      className="fixed inset-0 z-50 bg-gray-100 animate-in fade-in duration-150"
    >
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden px-4 pt-3.5 md:px-8 md:pt-8 md:pb-6">
        <PageHeader
          icon={<Notebook />}
          title="Diary"
          titleId="diary-modal-title"
          subtitle={formatJaDateWithWeekday(formData.date)}
          onBack={handleClose}
          backLabel="戻る"
          nowrap
          className="mb-3 md:mb-5"
          actions={
            <>
              <div className="flex items-center text-xs">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Saved</span>
                  </span>
                )}
                {saveStatus === 'error' && (
                  <button
                    type="button"
                    onClick={() => persistDiary(latestDataRef.current)}
                    className="font-semibold text-red-600 underline"
                  >
                    Retry
                  </button>
                )}
              </div>

              {onChangeDate && (
                <div className="flex shrink-0 items-center gap-1.5">
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
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
          {saveError && (
            <div className="mb-4 shrink-0">
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600"
              >
                {saveError}
              </div>
            </div>
          )}

          <div className="grid w-full flex-1 grid-cols-1 gap-4 pb-10 md:h-full md:grid-cols-12 md:gap-5 md:overflow-hidden md:pb-0">
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
                  <span>Flagged</span>
                </button>
              </div>
              <div className="relative" ref={rateMenuRef}>
                {(() => {
                  const selectedRate = getRateOption(formData.rate);
                  return (
                    <button
                      type="button"
                      aria-label="Rate"
                      aria-haspopup="listbox"
                      aria-expanded={isRateMenuOpen}
                      onClick={() => setIsRateMenuOpen((open) => !open)}
                      className={`w-full p-3 rounded-xl border bg-gray-50 text-gray-700 flex items-center justify-between transition-colors focus:outline-none ${
                        isRateMenuOpen
                          ? 'border-gray-400'
                          : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedRate.dotColor}`}
                        />
                        {selectedRate.stars && (
                          <span className="text-sm leading-none tracking-tight text-primary-500 shrink-0">
                            {selectedRate.stars}
                          </span>
                        )}
                        <span className="text-sm font-medium truncate">
                          {selectedRate.label}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${
                          isRateMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  );
                })()}

                {isRateMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Rate"
                    className="absolute left-0 right-0 z-20 mt-2 p-1.5 rounded-xl border border-gray-100 bg-white shadow-xl flex flex-col gap-1"
                  >
                    {RATE_OPTIONS.map((option) => {
                      const isSelected = formData.rate === option.value;
                      return (
                        <button
                          key={option.value ?? 'none'}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            updateFormAndScheduleSave(
                              (prev) => ({ ...prev, rate: option.value }),
                              true,
                            );
                            setIsRateMenuOpen(false);
                          }}
                          className={`p-3 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              aria-hidden="true"
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${option.dotColor}`}
                            />
                            {option.stars && (
                              <span className="text-sm leading-none tracking-tight text-primary-500">
                                {option.stars}
                              </span>
                            )}
                            <span className="text-sm font-medium truncate">
                              {option.label}
                            </span>
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 shrink-0 text-primary-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                          {formatTimeFromIso(spark.recorded_at)}
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
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="diary-note-textarea"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                >
                  Note (Markdown)
                </label>
                {checklistStats && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                      checklistStats.checked === checklistStats.total
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-primary-50 text-primary-700'
                    }`}
                  >
                    <CheckSquare className="h-3 w-3" />
                    {checklistStats.checked}/{checklistStats.total}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {noteMode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleInsertChecklist}
                    title="チェックリスト行を挿入 (- [ ])"
                    aria-label="チェックリスト行を挿入"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                  >
                    <ListTodo className="h-4 w-4" />
                  </button>
                )}

                <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setNoteMode('edit')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      noteMode === 'edit'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteMode('preview')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      noteMode === 'preview'
                        ? 'bg-white text-primary-700 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            </div>

            {noteMode === 'edit' ? (
              <textarea
                ref={textareaRef}
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
            ) : (
              <div className="w-full flex-1 min-h-[320px] md:min-h-0 overflow-y-auto border-t border-gray-100 pt-3 trails-scrollbar">
                <MarkdownPreview
                  content={formData.content}
                  onToggleChecklist={handleToggleChecklist}
                />
              </div>
            )}
          </section>
          </div>
        </main>
      </div>
    </div>
  );
}
