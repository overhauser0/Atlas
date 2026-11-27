'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Clock,
  FileText,
  Loader2,
  Notebook,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
  Zap,
} from 'lucide-react';
import type { DiaryItem, LifeItem, SparkItem } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import {
  formatJaDateWithWeekday,
  formatTimeFromIso,
  getDateFullString,
} from '@atlas/shared/date';
import { appendPieceBlocks } from '@atlas/shared/notion';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatSparkTimestampForBody } from '@/components/modal/detail-modal/sparkUtils';

interface SparksTabProps {
  sparks: SparkItem[];
  isLoading: boolean;
  error: string | null;
  items: LifeItem[];
  onRefresh: () => Promise<void>;
  onRemoveSparks: (ids: string[]) => void;
  onCreatePieceFromSpark: (spark: SparkItem) => void;
  onOpenDiaryDate: (date: string) => void;
}

const getNowDateAndTime = () => {
  const now = new Date();
  const date = getDateFullString(now, 'hyphen');
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
  return { date, time };
};

const toLocalIsoWithOffset = (dateStr: string, timeStr: string): string => {
  const safeTime = /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '00:00';
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = safeTime.split(':').map(Number);
  const localDate = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(localDate.getTime())) {
    return new Date().toISOString();
  }
  const offsetMin = -localDate.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const offH = String(Math.floor(absMin / 60)).padStart(2, '0');
  const offM = String(absMin % 60).padStart(2, '0');
  return `${dateStr}T${safeTime}:00${sign}${offH}:${offM}`;
};

const getSparkEditDefaults = (spark: SparkItem) => {
  const parsed = new Date(spark.recorded_at);
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: spark.target_date,
      time: '00:00',
    };
  }
  const date = getDateFullString(parsed, 'hyphen');
  const time = `${String(parsed.getHours()).padStart(2, '0')}:${String(
    parsed.getMinutes(),
  ).padStart(2, '0')}`;
  return { date, time };
};

const isPieceMatchingDate = (piece: LifeItem, dateKey: string): boolean => {
  const start = piece.start_date?.slice(0, 10);
  if (!start) return false;
  const end = piece.end_date?.slice(0, 10) || start;
  return dateKey >= start && dateKey <= end;
};

export default function SparksTab({
  sparks,
  isLoading,
  error,
  items,
  onRefresh,
  onRemoveSparks,
  onCreatePieceFromSpark,
  onOpenDiaryDate,
}: SparksTabProps) {
  const { addToast } = useToast();

  // Sync / Filter states
  const [isSyncing, setIsSyncing] = useState(false);
  const [query, setQuery] = useState('');

  // Quick-add composer states
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newDate, setNewDate] = useState(() => getNowDateAndTime().date);
  const [newTime, setNewTime] = useState(() => getNowDateAndTime().time);
  const [isCreatingSpark, setIsCreatingSpark] = useState(false);

  // Inline edit states
  const [editingSparkId, setEditingSparkId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Busy tracking
  const [busySparkIds, setBusySparkIds] = useState<Set<string>>(new Set());
  const [busyDateKey, setBusyDateKey] = useState<string | null>(null);

  // Piece picker modal (append Spark to Notion Piece body)
  const [appendTargetSpark, setAppendTargetSpark] = useState<SparkItem | null>(
    null,
  );
  const [pieceQuery, setPieceQuery] = useState('');
  const [isAppendingToPiece, setIsAppendingToPiece] = useState(false);

  useEffect(() => {
    if (!appendTargetSpark) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAppendingToPiece) {
        setAppendTargetSpark(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appendTargetSpark, isAppendingToPiece]);

  const todayKey = getDateFullString(new Date(), 'hyphen');

  const markBusy = (id: string, busy: boolean) => {
    setBusySparkIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const filteredSparks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ja');
    if (!normalized) return sparks;
    return sparks.filter(
      (spark) =>
        spark.content.toLocaleLowerCase('ja').includes(normalized) ||
        spark.target_date.includes(normalized),
    );
  }, [sparks, query]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, SparkItem[]>();
    filteredSparks.forEach((spark) => {
      const key = spark.target_date || spark.recorded_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(spark);
      map.set(key, list);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filteredSparks]);

  const notionPieces = useMemo(() => {
    const allNotion = items.filter((item) => item.source === 'NOTION');
    const normalized = pieceQuery.trim().toLocaleLowerCase('ja');
    const filtered = normalized
      ? allNotion.filter(
          (item) =>
            item.title.toLocaleLowerCase('ja').includes(normalized) ||
            item.note?.toLocaleLowerCase('ja').includes(normalized) ||
            item.fkw?.some((tag) =>
              tag.toLocaleLowerCase('ja').includes(normalized),
            ),
        )
      : allNotion;

    const targetDate = appendTargetSpark?.target_date ?? '';
    return [...filtered]
      .sort((a, b) => {
        const aMatch = targetDate && isPieceMatchingDate(a, targetDate) ? 1 : 0;
        const bMatch = targetDate && isPieceMatchingDate(b, targetDate) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        const aDate = a.start_date?.slice(0, 10) || '';
        const bDate = b.start_date?.slice(0, 10) || '';
        return bDate.localeCompare(aDate);
      })
      .slice(0, 40);
  }, [items, pieceQuery, appendTargetSpark]);

  const handleSyncSparks = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await atlasFetch('/sparks/sync', { method: 'POST' });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(
          errorBody?.message || `同期に失敗しました (${res.status})`,
        );
      }
      await onRefresh();
      addToast('DiscordからSparksを同期しました');
    } catch (syncError) {
      console.error('Failed to sync sparks:', syncError);
      addToast(
        syncError instanceof Error
          ? syncError.message
          : 'Sparksの同期に失敗しました',
        'alert',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenComposer = () => {
    const { date, time } = getNowDateAndTime();
    setNewDate(date);
    setNewTime(time);
    setNewContent('');
    setIsComposerOpen(true);
  };

  const handleCreateSpark = async () => {
    const trimmed = newContent.trim();
    if (!trimmed || !newDate || isCreatingSpark) return;

    setIsCreatingSpark(true);
    try {
      const res = await atlasFetch('/sparks', {
        method: 'POST',
        body: JSON.stringify({
          content: trimmed,
          recorded_at: toLocalIsoWithOffset(newDate, newTime),
          target_date: newDate,
        }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(
          errorBody?.message || `Sparkの追加に失敗しました (${res.status})`,
        );
      }
      setNewContent('');
      setIsComposerOpen(false);
      await onRefresh();
      addToast('Sparkを追加しました');
    } catch (createError) {
      console.error('Failed to create spark:', createError);
      addToast(
        createError instanceof Error
          ? createError.message
          : 'Sparkの追加に失敗しました',
        'alert',
      );
    } finally {
      setIsCreatingSpark(false);
    }
  };

  const handleStartEdit = (spark: SparkItem) => {
    const { date, time } = getSparkEditDefaults(spark);
    setEditingSparkId(spark.id);
    setEditContent(spark.content);
    setEditDate(date);
    setEditTime(time);
  };

  const handleSaveEdit = async (sparkId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed || !editDate || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const res = await atlasFetch(`/sparks/${sparkId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: trimmed,
          recorded_at: toLocalIsoWithOffset(editDate, editTime),
          target_date: editDate,
        }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(
          errorBody?.message || `Sparkの更新に失敗しました (${res.status})`,
        );
      }
      setEditingSparkId(null);
      await onRefresh();
      addToast('Sparkを更新しました');
    } catch (editError) {
      console.error('Failed to update spark:', editError);
      addToast(
        editError instanceof Error
          ? editError.message
          : 'Sparkの更新に失敗しました',
        'alert',
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const appendLinesToDiary = async (dateKey: string, lines: string[]) => {
    let existing: DiaryItem | null = null;
    const getRes = await atlasFetch(`/diaries/${dateKey}`);
    if (getRes.ok) {
      const json = (await getRes.json()) as { diary?: DiaryItem | null };
      existing = json.diary ?? null;
    } else if (getRes.status !== 404) {
      throw new Error(`日記の取得に失敗しました (${getRes.status})`);
    }

    const baseContent = (existing?.content ?? '').trimEnd();
    const appended = lines.join('\n');
    const nextContent = baseContent ? `${baseContent}\n${appended}` : appended;

    const saveRes = await atlasFetch('/diaries', {
      method: 'POST',
      body: JSON.stringify({
        date: dateKey,
        rate: existing?.rate ?? null,
        content: nextContent,
        flag: existing?.flag ?? false,
        piece_ids: existing?.piece_ids ?? [],
      }),
    });
    if (!saveRes.ok) {
      throw new Error(`日記の保存に失敗しました (${saveRes.status})`);
    }
  };

  const handlePromoteToDiary = async (spark: SparkItem) => {
    if (busySparkIds.has(spark.id)) return;
    markBusy(spark.id, true);
    try {
      const timeLabel = formatTimeFromIso(spark.recorded_at);
      const line = timeLabel
        ? `- **${timeLabel}** ${spark.content}`
        : `- ${spark.content}`;

      await appendLinesToDiary(spark.target_date, [line]);

      const consumeRes = await atlasFetch(`/sparks/${spark.id}/consume`, {
        method: 'PATCH',
      });
      if (!consumeRes.ok) {
        throw new Error(
          `日記へ追記しましたが、Sparkの消化更新に失敗しました (${consumeRes.status})`,
        );
      }

      onRemoveSparks([spark.id]);
      addToast(`${spark.target_date} の日記に追記しました`);
    } catch (promoteError) {
      console.error('Failed to promote spark to diary:', promoteError);
      addToast(
        promoteError instanceof Error
          ? promoteError.message
          : '日記への追記に失敗しました',
        'alert',
      );
    } finally {
      markBusy(spark.id, false);
    }
  };

  const handlePromoteDateToDiary = async (
    dateKey: string,
    dateSparks: SparkItem[],
  ) => {
    if (busyDateKey || dateSparks.length === 0) return;
    setBusyDateKey(dateKey);
    try {
      const lines = dateSparks.map((spark) => {
        const timeLabel = formatTimeFromIso(spark.recorded_at);
        return timeLabel
          ? `- **${timeLabel}** ${spark.content}`
          : `- ${spark.content}`;
      });
      await appendLinesToDiary(dateKey, lines);

      const ids = dateSparks.map((s) => s.id);
      const consumeRes = await atlasFetch('/sparks/consume-bulk', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      if (!consumeRes.ok) {
        throw new Error(
          `日記へ追記しましたが、Sparkの一括消化に失敗しました (${consumeRes.status})`,
        );
      }

      onRemoveSparks(ids);
      addToast(`${dateKey} の日記に ${ids.length}件を追記しました`);
    } catch (bulkError) {
      console.error('Failed to promote date sparks to diary:', bulkError);
      addToast(
        bulkError instanceof Error
          ? bulkError.message
          : '日記への一括追記に失敗しました',
        'alert',
      );
    } finally {
      setBusyDateKey(null);
    }
  };

  const handleDismissSpark = async (sparkId: string) => {
    if (busySparkIds.has(sparkId)) return;
    markBusy(sparkId, true);
    try {
      const res = await atlasFetch(`/sparks/${sparkId}/consume`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error(`Sparkの消化に失敗しました (${res.status})`);
      }
      onRemoveSparks([sparkId]);
    } catch (dismissError) {
      console.error('Failed to dismiss spark:', dismissError);
      addToast(
        dismissError instanceof Error
          ? dismissError.message
          : 'Sparkの消化に失敗しました',
        'alert',
      );
    } finally {
      markBusy(sparkId, false);
    }
  };

  const handleAppendSparkToPiece = async (piece: LifeItem) => {
    if (!appendTargetSpark || isAppendingToPiece) return;
    setIsAppendingToPiece(true);
    try {
      await appendPieceBlocks(piece.id, [
        {
          timestamp: formatSparkTimestampForBody(appendTargetSpark.recorded_at),
          content: appendTargetSpark.content,
        },
      ]);

      const consumeRes = await atlasFetch(
        `/sparks/${appendTargetSpark.id}/consume`,
        { method: 'PATCH' },
      );
      if (!consumeRes.ok) {
        throw new Error(
          `Notion本文へ追記しましたが、Sparkの消化更新に失敗しました (${consumeRes.status})`,
        );
      }

      onRemoveSparks([appendTargetSpark.id]);
      addToast(`「${piece.title}」の本文に追記しました`);
      setAppendTargetSpark(null);
      setPieceQuery('');
    } catch (appendError) {
      console.error('Failed to append spark to piece:', appendError);
      addToast(
        appendError instanceof Error
          ? appendError.message
          : 'Pieceへの追記に失敗しました',
        'alert',
      );
    } finally {
      setIsAppendingToPiece(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
      <PageHeader
        icon={<Zap />}
        title="Sparks"
        subtitle={`${sparks.length}件の未消化メモ`}
        nowrap
        className="mb-4"
        actions={
          <>
            <button
              type="button"
              onClick={() => void handleSyncSparks()}
              disabled={isSyncing}
              aria-label="DiscordからSparksを同期"
              title="DiscordからSparksを同期"
              className="trails-nav-icon-btn"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() =>
                isComposerOpen
                  ? setIsComposerOpen(false)
                  : handleOpenComposer()
              }
              className="trails-btn-primary py-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </>
        }
      />

      {/* クイック追加フォーム */}
      {isComposerOpen && (
        <section className="trails-card mb-4 shrink-0 space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="trails-section-label">New Spark</span>
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              aria-label="閉じる"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              aria-label="日付"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="trails-input py-2 text-xs"
            />
            <input
              type="time"
              aria-label="時刻"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="trails-input py-2 text-xs"
            />
          </div>
          <textarea
            autoFocus
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleCreateSpark();
              }
            }}
            placeholder="思いつきやメモを入力... (Cmd/Ctrl + Enter で追加)"
            className="trails-input resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="trails-btn-ghost py-2 text-xs"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={!newContent.trim() || !newDate || isCreatingSpark}
              onClick={() => void handleCreateSpark()}
              className="trails-btn-primary py-2 text-xs"
            >
              {isCreatingSpark ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Sparkを追加
            </button>
          </div>
        </section>
      )}

      {/* 絞り込み検索バー */}
      {sparks.length > 0 && (
        <div className="mb-4 shrink-0">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="メモを検索..."
              aria-label="Sparkを検索"
              className="trails-input bg-white pl-10 pr-10 shadow-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="検索をクリア"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      )}

      {/* Sparks 一覧 */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-28 no-scrollbar md:pb-12">
        {isLoading && sparks.length === 0 ? (
          <div className="trails-card p-10 text-center text-sm font-medium text-gray-400 animate-pulse">
            Sparksを読み込み中...
          </div>
        ) : error ? (
          <div className="trails-card flex flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="trails-btn-secondary text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              再読み込み
            </button>
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="trails-card flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
              <Zap className="h-6 w-6" />
            </div>
            <p className="mt-1 text-sm font-bold text-gray-800">
              {query.trim()
                ? '条件に一致するSparkはありません'
                : '未消化のSparkはありません'}
            </p>
            <p className="text-xs text-gray-400">
              {query.trim()
                ? '別のキーワードで検索してみてください'
                : '右上の同期または追加ボタンからメモを取り込めます'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDate.map(([dateKey, dateSparks]) => {
              const isBulkBusy = busyDateKey === dateKey;
              return (
                <section key={dateKey}>
                  <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenDiaryDate(dateKey)}
                        className="truncate text-sm font-bold text-gray-800 transition-colors hover:text-primary-600"
                        title="この日の日記を開く"
                      >
                        {formatJaDateWithWeekday(dateKey)}
                      </button>
                      {dateKey === todayKey && (
                        <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          今日
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-400">
                        {dateSparks.length}件
                      </span>
                    </div>

                    {dateSparks.length > 1 && (
                      <button
                        type="button"
                        disabled={Boolean(busyDateKey)}
                        onClick={() =>
                          void handlePromoteDateToDiary(dateKey, dateSparks)
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
                      >
                        {isBulkBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Notebook className="h-3.5 w-3.5" />
                        )}
                        すべて日記へ
                      </button>
                    )}
                  </div>

                  <div className="trails-card divide-y divide-gray-100 overflow-hidden">
                    {dateSparks.map((spark) => {
                      const isBusy =
                        busySparkIds.has(spark.id) || isBulkBusy;
                      const isEditing = editingSparkId === spark.id;
                      const timeLabel = formatTimeFromIso(spark.recorded_at);

                      if (isEditing) {
                        return (
                          <div
                            key={spark.id}
                            className="space-y-3 bg-primary-50/20 p-4 md:p-5"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                aria-label="日付を編集"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="trails-input bg-white py-2 text-xs"
                              />
                              <input
                                type="time"
                                aria-label="時刻を編集"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="trails-input bg-white py-2 text-xs"
                              />
                            </div>
                            <textarea
                              rows={3}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="trails-input bg-white resize-y"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={isSavingEdit}
                                onClick={() => setEditingSparkId(null)}
                                className="trails-btn-ghost py-1.5 text-xs"
                              >
                                キャンセル
                              </button>
                              <button
                                type="button"
                                disabled={
                                  !editContent.trim() ||
                                  !editDate ||
                                  isSavingEdit
                                }
                                onClick={() => void handleSaveEdit(spark.id)}
                                className="trails-btn-primary py-1.5 text-xs"
                              >
                                {isSavingEdit ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                保存
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <article
                          key={spark.id}
                          className="flex flex-col gap-3 p-4 md:p-5"
                        >
                          <div className="flex items-start gap-2.5">
                            {timeLabel && (
                              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-500">
                                <Clock className="h-3 w-3 text-gray-400" />
                                {timeLabel}
                              </span>
                            )}
                            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
                              {spark.content}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handlePromoteToDiary(spark)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Notebook className="h-3.5 w-3.5" />
                                )}
                                日記へ追記
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => onCreatePieceFromSpark(spark)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                                Pieceを作成
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setAppendTargetSpark(spark);
                                  setPieceQuery('');
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Pieceに追記
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleStartEdit(spark)}
                                aria-label="日時と内容を編集"
                                title="日時と内容を編集"
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDismissSpark(spark.id)}
                                aria-label="消化済みにする"
                                title="消化済みにする（破棄）"
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* 既存Pieceへの追記モーダル */}
      {appendTargetSpark && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isAppendingToPiece) {
              setAppendTargetSpark(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="spark-piece-picker-title"
            className="trails-modal-panel flex max-h-[85vh] w-full max-w-lg flex-col p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2
                id="spark-piece-picker-title"
                className="text-lg font-bold text-gray-900"
              >
                追記先の Notion Piece を選択
              </h2>
              <button
                type="button"
                disabled={isAppendingToPiece}
                onClick={() => setAppendTargetSpark(null)}
                aria-label="閉じる"
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
              <p className="mb-1 font-mono text-[11px] text-gray-400">
                {appendTargetSpark.target_date}{' '}
                {formatTimeFromIso(appendTargetSpark.recorded_at)}
              </p>
              <p className="line-clamp-3 whitespace-pre-wrap break-words">
                {appendTargetSpark.content}
              </p>
            </div>

            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="search"
                value={pieceQuery}
                onChange={(e) => setPieceQuery(e.target.value)}
                placeholder="Pieceのタイトルやタグで検索..."
                className="trails-input pl-9"
              />
            </label>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-100 trails-scrollbar">
              {notionPieces.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  該当する Notion Piece がありません
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notionPieces.map((piece) => {
                    const isSameDay = isPieceMatchingDate(
                      piece,
                      appendTargetSpark.target_date,
                    );
                    return (
                      <li key={piece.id}>
                        <button
                          type="button"
                          disabled={isAppendingToPiece}
                          onClick={() => void handleAppendSparkToPiece(piece)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-50 disabled:opacity-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-gray-900">
                                {piece.title}
                              </span>
                              {isSameDay && (
                                <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                                  同日
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {piece.start_date?.slice(0, 10) || '日付未設定'}
                              {piece.topics?.length
                                ? ` · ${piece.topics.join(', ')}`
                                : ''}
                            </p>
                          </div>
                          {isAppendingToPiece ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-500" />
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-gray-400" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
