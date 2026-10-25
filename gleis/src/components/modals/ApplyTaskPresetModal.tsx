'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ClipboardList, LoaderCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Task } from '@/types';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/ui/Toast';

interface PresetChild {
  id: string;
  title_suffix: string;
  offset_days: number;
}

interface TaskPreset {
  id: string;
  label: string;
  description: string | null;
  children: PresetChild[];
}

interface Props {
  isOpen: boolean;
  parentTask: Pick<Task, 'id' | 'title' | 'date'>;
  onClose: () => void;
  onApplied: () => void;
}

const getDatePart = (date: string | null | undefined) =>
  date ? date.slice(0, 10) : '';

const formatDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year}/${month}/${day}`;
};

const addDays = (baseDate: string, offsetDays: number) => {
  if (!baseDate) return '';
  const date = new Date(`${baseDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export default function ApplyTaskPresetModal({
  isOpen,
  parentTask,
  onClose,
  onApplied,
}: Props) {
  const { addToast } = useToast();
  const [presets, setPresets] = useState<TaskPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [presetId, setPresetId] = useState('');
  const [baseDate, setBaseDate] = useState(getDatePart(parentTask.date));
  const [titlePrefix, setTitlePrefix] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBaseDate(getDatePart(parentTask.date));
    setTitlePrefix('');
    setPresetId('');
    setPresets([]);

    let isCurrent = true;
    const loadPresets = async () => {
      try {
        setIsLoading(true);
        const response = await atlasFetch('/task-presets');
        if (!response.ok) throw new Error('Failed to fetch presets');
        const data = await response.json();
        if (!isCurrent) return;
        const loadedPresets: TaskPreset[] = data.presets || [];
        setPresets(loadedPresets);
        setPresetId(loadedPresets[0]?.id || '');
      } catch (error) {
        console.error(error);
        if (isCurrent) addToast('プリセットを取得できませんでした', 'alert');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    void loadPresets();
    return () => {
      isCurrent = false;
    };
  }, [isOpen, parentTask.date, addToast]);

  const selectedPreset = presets.find((preset) => preset.id === presetId);
  const previewTasks = useMemo(
    () =>
      (selectedPreset?.children || []).map((child) => ({
        id: child.id,
        title: `${titlePrefix}${child.title_suffix}`,
        date: addDays(baseDate, child.offset_days),
      })),
    [selectedPreset, titlePrefix, baseDate],
  );

  const handleApply = async () => {
    if (!selectedPreset) {
      addToast('プリセットを選択してください', 'alert');
      return;
    }
    if (!baseDate) {
      addToast('基準日を入力してください', 'alert');
      return;
    }
    if (!previewTasks.every((task) => task.date)) {
      addToast('有効な基準日を入力してください', 'alert');
      return;
    }

    try {
      setIsApplying(true);
      const response = await atlasFetch(
        `/pieces/${parentTask.id}/apply-preset`,
        {
          method: 'POST',
          body: JSON.stringify({
            presetId,
            baseDate,
            titlePrefix: titlePrefix || undefined,
          }),
        },
      );
      if (!response.ok) throw new Error('Failed to apply preset');

      const result = await response.json();
      addToast(`${result.created_count}件の子タスクを追加しました`, 'info');
      onClose();
      onApplied();
    } catch (error) {
      console.error(error);
      addToast('プリセットを適用できませんでした', 'alert');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isApplying) onClose();
      }}
    >
      <div className="noir-glass w-full max-w-lg rounded-2xl p-5 md:p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto noir-scrollbar">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-neon" />
              プリセットを追加
            </h2>
            <p className="text-xs text-gray-500 mt-1 truncate">
              親タスク: {parentTask.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="noir-icon-btn"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Preset
          </label>
          <select
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
            disabled={isLoading || presets.length === 0}
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-neon focus:outline-none"
          >
            {presets.length === 0 && (
              <option value="" className="bg-gray-900">
                {isLoading ? 'Loading presets...' : 'プリセットがありません'}
              </option>
            )}
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-gray-900">
                {preset.label}
              </option>
            ))}
          </select>
          {selectedPreset?.description && (
            <p className="text-xs text-gray-500">
              {selectedPreset.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Base Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                type="date"
                value={baseDate}
                onChange={(event) => setBaseDate(event.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:border-neon focus:outline-none"
              />
            </div>
            {!baseDate && (
              <p className="text-[11px] text-amber-400">
                親タスクに日付がないため、基準日を指定してください
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Title Prefix (optional)
            </label>
            <input
              value={titlePrefix}
              onChange={(event) => setTitlePrefix(event.target.value)}
              maxLength={200}
              placeholder="例: [旅行] "
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:border-neon focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            追加されるタスク
          </h3>
          {isLoading ? (
            <div className="py-5 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              Loading presets...
            </div>
          ) : !selectedPreset || previewTasks.length === 0 ? (
            <div className="py-5 text-center text-xs text-gray-500 border border-dashed border-white/10 rounded-xl">
              子タスクはありません
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto noir-scrollbar rounded-xl border border-white/5 divide-y divide-white/5">
              {previewTasks.map((preview) => (
                <div
                  key={preview.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-sm text-gray-200 truncate">
                    {preview.title}
                  </span>
                  <span className="text-xs text-gray-500 font-mono shrink-0">
                    {formatDate(preview.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || isLoading || !selectedPreset}
            className="px-4 py-2.5 text-xs font-bold text-white bg-neon hover:brightness-110 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
          >
            {isApplying && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {isApplying ? '追加中...' : '子タスクを追加'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
