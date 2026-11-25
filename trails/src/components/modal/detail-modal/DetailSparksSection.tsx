'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import { atlasFetch } from '@atlas/shared/api';
import { appendPieceBlocks, type NotionBlock } from '@atlas/shared/notion';
import { useToast } from '@/components/ui/Toast';
import {
  filterSparksForItem,
  formatDateRangeChipLabel,
  formatSparkTimestampForBody,
  type SparkFilterMode,
  type SparkItem,
} from './sparkUtils';

interface DetailSparksSectionProps {
  pieceId: string;
  startDate: string | null;
  endDate: string | null;
  onBlocksAppended: (newBlocks: NotionBlock[]) => void;
}

const extractSparks = (json: unknown): SparkItem[] => {
  if (Array.isArray(json)) return json as SparkItem[];
  if (
    json &&
    typeof json === 'object' &&
    'data' in json &&
    Array.isArray((json as { data?: unknown }).data)
  ) {
    return (json as { data: SparkItem[] }).data;
  }
  return [];
};

export default function DetailSparksSection({
  pieceId,
  startDate,
  endDate,
  onBlocksAppended,
}: DetailSparksSectionProps) {
  const { addToast } = useToast();
  const [allSparks, setAllSparks] = useState<SparkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<SparkFilterMode>(() =>
    startDate ? 'range' : 'all',
  );
  const [busySparkIds, setBusySparkIds] = useState<Set<string>>(new Set());
  const [isBulkAppending, setIsBulkAppending] = useState(false);

  const hasStartDate = Boolean(startDate?.slice(0, 10));

  useEffect(() => {
    setFilterMode(hasStartDate ? 'range' : 'all');
  }, [pieceId, hasStartDate]);

  const fetchSparks = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await atlasFetch('/sparks', { method: 'GET', signal });
      if (!res.ok) return;
      const json: unknown = await res.json();
      setAllSparks(extractSparks(json));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to fetch sparks', error);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    void fetchSparks(controller.signal);

    const handleRefresh = () => {
      void fetchSparks();
    };
    window.addEventListener('refresh_sparks', handleRefresh);

    return () => {
      controller.abort();
      window.removeEventListener('refresh_sparks', handleRefresh);
    };
  }, [pieceId, fetchSparks]);

  const rangeSparks = useMemo(
    () =>
      filterSparksForItem(allSparks, {
        startDate,
        endDate,
        mode: 'range',
      }),
    [allSparks, startDate, endDate],
  );

  const visibleSparks = useMemo(
    () => (filterMode === 'range' && hasStartDate ? rangeSparks : allSparks),
    [filterMode, hasStartDate, rangeSparks, allSparks],
  );

  const rangeChipLabel = useMemo(
    () => formatDateRangeChipLabel(startDate, endDate),
    [startDate, endDate],
  );

  const handleAppendSpark = async (spark: SparkItem) => {
    if (isBulkAppending || busySparkIds.has(spark.id)) return;

    setBusySparkIds((prev) => new Set(prev).add(spark.id));
    try {
      const createdBlocks = await appendPieceBlocks(pieceId, [
        {
          timestamp: formatSparkTimestampForBody(spark.recorded_at),
          content: spark.content,
        },
      ]);

      onBlocksAppended(createdBlocks);
      setAllSparks((prev) => prev.filter((item) => item.id !== spark.id));

      try {
        const consumeRes = await atlasFetch(`/sparks/${spark.id}/consume`, {
          method: 'PATCH',
        });
        if (!consumeRes.ok) {
          throw new Error(`Failed to consume spark (${consumeRes.status})`);
        }
      } catch (consumeError) {
        console.error('Failed to consume spark after append', consumeError);
        addToast(
          'Notion 本文へ追記しましたが、Spark の消化更新に失敗しました',
          'alert',
        );
        return;
      }

      addToast('Notion 本文に Spark を追記しました', 'info');
    } catch (error) {
      console.error('Failed to append spark to Notion body', error);
      addToast('Notion 本文への追記に失敗しました', 'alert');
    } finally {
      setBusySparkIds((prev) => {
        const next = new Set(prev);
        next.delete(spark.id);
        return next;
      });
    }
  };

  const handleAppendAllSparks = async () => {
    if (isBulkAppending || visibleSparks.length === 0) return;

    const targetSparks = [...visibleSparks];
    const targetIds = targetSparks.map((s) => s.id);
    setIsBulkAppending(true);

    try {
      const createdBlocks = await appendPieceBlocks(
        pieceId,
        targetSparks.map((spark) => ({
          timestamp: formatSparkTimestampForBody(spark.recorded_at),
          content: spark.content,
        })),
      );

      onBlocksAppended(createdBlocks);
      const idSet = new Set(targetIds);
      setAllSparks((prev) => prev.filter((item) => !idSet.has(item.id)));

      try {
        const consumeRes = await atlasFetch('/sparks/consume-bulk', {
          method: 'POST',
          body: JSON.stringify({ ids: targetIds }),
        });
        if (!consumeRes.ok) {
          throw new Error(
            `Failed to bulk consume sparks (${consumeRes.status})`,
          );
        }
      } catch (consumeError) {
        console.error('Failed to bulk consume sparks', consumeError);
        addToast(
          'Notion 本文へ追記しましたが、Spark の一括消化に失敗しました',
          'alert',
        );
        return;
      }

      addToast(
        `${targetSparks.length}件の Spark を Notion 本文に追記しました`,
        'info',
      );
    } catch (error) {
      console.error('Failed to bulk append sparks', error);
      addToast('Spark の一括追記に失敗しました', 'alert');
    } finally {
      setIsBulkAppending(false);
    }
  };

  const handleDismissSpark = async (sparkId: string) => {
    if (isBulkAppending || busySparkIds.has(sparkId)) return;

    setBusySparkIds((prev) => new Set(prev).add(sparkId));
    try {
      const res = await atlasFetch(`/sparks/${sparkId}/consume`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error(`Failed to dismiss spark (${res.status})`);
      }
      setAllSparks((prev) => prev.filter((item) => item.id !== sparkId));
    } catch (error) {
      console.error('Failed to dismiss spark', error);
      addToast('Spark の破棄に失敗しました', 'alert');
    } finally {
      setBusySparkIds((prev) => {
        const next = new Set(prev);
        next.delete(sparkId);
        return next;
      });
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-500" />
          <span className="trails-section-label">
            Unconsumed Sparks ({visibleSparks.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasStartDate && (
            <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => setFilterMode('range')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  filterMode === 'range'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                期間内{rangeChipLabel ? ` (${rangeChipLabel})` : ''} ·{' '}
                {rangeSparks.length}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                すべて · {allSparks.length}
              </button>
            </div>
          )}

          {visibleSparks.length > 1 && (
            <button
              type="button"
              disabled={isBulkAppending}
              onClick={() => void handleAppendAllSparks()}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 hover:bg-primary-100 disabled:opacity-50 transition-colors"
            >
              {isBulkAppending && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              すべて追記
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-5 text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>未消化の Spark を読み込み中...</span>
        </div>
      ) : visibleSparks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-4 text-center text-xs text-gray-400">
          {filterMode === 'range' && hasStartDate && allSparks.length > 0
            ? 'この期間の未消化 Spark はありません（「すべて」から他日の Spark も選択できます）'
            : '未消化の Spark はありません'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto trails-scrollbar pr-1">
          {visibleSparks.map((spark) => {
            const isBusy = isBulkAppending || busySparkIds.has(spark.id);
            const timestampLabel = formatSparkTimestampForBody(
              spark.recorded_at,
            );
            return (
              <li
                key={spark.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  {timestampLabel && (
                    <span className="mr-2 font-mono text-[11px] font-semibold text-gray-400">
                      {timestampLabel}
                    </span>
                  )}
                  <span className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {spark.content}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleAppendSpark(spark)}
                    title="Notion Bodyに追記"
                    aria-label="Notion Bodyに追記"
                    className="rounded-lg bg-primary-500 p-1.5 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleDismissSpark(spark.id)}
                    title="破棄"
                    aria-label="破棄"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
