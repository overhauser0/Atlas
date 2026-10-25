'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList,
  Plus,
  Save,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/ui/Toast';
import { getStatusColor } from '@/utils/miscellaneousUtils';
import type { TaskStatus } from '@/types';

const PRESET_STATUSES: TaskStatus[] = ['INBOX', 'Waiting', 'Going', 'Done'];

interface PresetChild {
  id?: string;
  title_suffix: string;
  offset_days: number;
  default_status: TaskStatus | null;
  sort_order: number;
}

interface TaskPreset {
  id: string;
  label: string;
  description: string | null;
  children: PresetChild[];
}

interface PresetForm {
  label: string;
  description: string;
  children: PresetChild[];
}

const EMPTY_FORM: PresetForm = {
  label: '',
  description: '',
  children: [
    {
      title_suffix: '',
      offset_days: 0,
      default_status: null,
      sort_order: 0,
    },
  ],
};

const inputClass =
  'w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-neon/50 focus:outline-none transition-colors';
const labelClass =
  'text-xs font-medium text-gray-400 uppercase tracking-wider';

const toForm = (preset: TaskPreset): PresetForm => ({
  label: preset.label,
  description: preset.description || '',
  children: preset.children.map((child, index) => ({
    ...child,
    sort_order: index,
  })),
});

export default function PresetSettings() {
  const { addToast } = useToast();
  const [presets, setPresets] = useState<TaskPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<PresetForm>(EMPTY_FORM);
  const [statusMenu, setStatusMenu] = useState<{
    index: number;
    anchor: HTMLButtonElement;
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const openStatusMenu = (index: number, anchor: HTMLButtonElement) => {
    const rect = anchor.getBoundingClientRect();
    const menuHeight = PRESET_STATUSES.length * 40 + 12;
    const top =
      rect.bottom + 8 + menuHeight > window.innerHeight && rect.top > menuHeight
        ? rect.top - menuHeight - 8
        : rect.bottom + 8;
    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - width - 8),
    );
    setStatusMenu({ index, anchor, top, left, width });
  };

  const fetchPresets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await atlasFetch('/task-presets');
      if (!response.ok) throw new Error('Failed to fetch presets');
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error(error);
      addToast('プリセットの取得に失敗しました', 'alert');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchPresets();
  }, [fetchPresets]);

  useEffect(() => {
    if (!statusMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !(event.target as Element).closest(
          '[data-preset-status-trigger], [data-preset-status-menu]',
        )
      ) {
        setStatusMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusMenu]);

  useEffect(() => {
    if (!statusMenu) return;
    const updatePosition = () => {
      if (statusMenu.anchor.isConnected) {
        openStatusMenu(statusMenu.index, statusMenu.anchor);
      } else {
        setStatusMenu(null);
      }
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [statusMenu]);

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setForm(EMPTY_FORM);
    setStatusMenu(null);
  };

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setForm({
      ...EMPTY_FORM,
      children: EMPTY_FORM.children.map((child) => ({ ...child })),
    });
  };

  const startEdit = (preset: TaskPreset) => {
    setIsCreating(false);
    setEditingId(preset.id);
    setForm(toForm(preset));
  };

  const updateChild = (index: number, updates: Partial<PresetChild>) => {
    setForm((current) => ({
      ...current,
      children: current.children.map((child, childIndex) =>
        childIndex === index ? { ...child, ...updates } : child,
      ),
    }));
  };

  const addChild = () => {
    setForm((current) => ({
      ...current,
      children: [
        ...current.children,
        {
          title_suffix: '',
          offset_days: 0,
          default_status: null,
          sort_order: current.children.length,
        },
      ],
    }));
  };

  const removeChild = (index: number) => {
    setForm((current) => ({
      ...current,
      children: current.children
        .filter((_, childIndex) => childIndex !== index)
        .map((child, sort_order) => ({ ...child, sort_order })),
    }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      addToast('プリセット名を入力してください', 'alert');
      return;
    }
    if (form.children.some((child) => !child.title_suffix.trim())) {
      addToast('すべての子タスク名を入力してください', 'alert');
      return;
    }

    const endpoint = isCreating
      ? '/task-presets'
      : `/task-presets/${editingId}`;
    try {
      setIsSaving(true);
      const response = await atlasFetch(endpoint, {
        method: isCreating ? 'POST' : 'PATCH',
        body: JSON.stringify({
          label: form.label.trim(),
          description: form.description || null,
          children: form.children.map((child, sort_order) => ({
            title_suffix: child.title_suffix.trim(),
            offset_days: child.offset_days,
            default_status: child.default_status,
            sort_order,
          })),
        }),
      });
      if (!response.ok) throw new Error('Failed to save preset');

      addToast(
        isCreating ? 'プリセットを作成しました' : 'プリセットを更新しました',
        'info',
      );
      cancelEdit();
      await fetchPresets();
    } catch (error) {
      console.error(error);
      addToast('プリセットの保存に失敗しました', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (preset: TaskPreset) => {
    if (!window.confirm(`「${preset.label}」を削除しますか？`)) return;
    try {
      const response = await atlasFetch(`/task-presets/${preset.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete preset');

      addToast('プリセットを削除しました', 'info');
      if (editingId === preset.id) cancelEdit();
      await fetchPresets();
    } catch (error) {
      console.error(error);
      addToast('プリセットの削除に失敗しました', 'alert');
    }
  };

  return (
    <section className="flex flex-col pb-4 gap-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 px-1 noir-label">
          <ClipboardList className="w-3.5 h-3.5" />
          Task Presets
        </h2>
        {!isCreating && (
          <button
            onClick={startCreate}
            className="text-xs flex items-center gap-1 font-bold text-neon hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
          >
            <Plus className="w-3.5 h-3.5" /> Add Preset
          </button>
        )}
      </div>

      {(isCreating || editingId) && (
        <div className="noir-glass rounded-2xl border border-white/10 p-4 md:p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {isCreating ? 'Create Preset' : 'Edit Preset'}
            </h3>
            <button
              onClick={cancelEdit}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              aria-label="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Preset Name</label>
            <input
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              maxLength={100}
              placeholder="e.g. Travel preparation"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={2}
              className={`${inputClass} resize-y noir-scrollbar`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className={labelClass}>Child Tasks</h4>
              <button
                onClick={addChild}
                className="text-[11px] flex items-center gap-1 text-gray-300 hover:text-white px-2 py-1 rounded-md hover:bg-white/10"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </div>
            {form.children.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4 border border-dashed border-white/10 rounded-xl">
                No child tasks. Add at least one task to use this preset.
              </div>
            ) : (
              <div className="overflow-x-auto noir-scrollbar pb-1">
                <div className="min-w-[620px] space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_110px_170px_36px] gap-2 px-3">
                    <span className={labelClass}>Task Title</span>
                    <span className={labelClass}>Date Offset</span>
                    <span className={labelClass}>State</span>
                    <span />
                  </div>
                  {form.children.map((child, index) => (
                    <div
                      key={child.id || `new-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_110px_170px_36px] gap-2 items-center bg-black/25 border border-white/5 rounded-xl p-3"
                    >
                      <div className="min-w-0">
                        <input
                          value={child.title_suffix}
                          onChange={(event) =>
                            updateChild(index, {
                              title_suffix: event.target.value,
                            })
                          }
                          maxLength={200}
                          placeholder="Task title"
                          aria-label={`Task title ${index + 1}`}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step={1}
                          value={child.offset_days}
                          onChange={(event) =>
                            updateChild(index, {
                              offset_days: Number(event.target.value),
                            })
                          }
                          aria-label={`Date offset ${index + 1}`}
                          className={inputClass}
                        />
                        <span className="text-[10px] text-gray-500">days</span>
                      </div>
                      <div>
                        <button
                          type="button"
                          data-preset-status-trigger
                          onClick={(event) => {
                            if (statusMenu?.index === index) {
                              setStatusMenu(null);
                            } else {
                              openStatusMenu(index, event.currentTarget);
                            }
                          }}
                          aria-label={`State ${index + 1}`}
                          aria-expanded={statusMenu?.index === index}
                          className={`w-full p-2.5 rounded-xl border bg-black/50 text-white flex items-center justify-between transition-colors focus:outline-none ${
                            statusMenu?.index === index
                              ? 'border-neon'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusColor(child.default_status || 'INBOX')}`}
                            />
                            <span className="text-xs tracking-wide font-medium truncate">
                              {child.default_status || 'INBOX'}
                            </span>
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
                              statusMenu?.index === index
                                ? 'rotate-180 text-neon'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                      <button
                        onClick={() => removeChild(index)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                        title="Remove task"
                        aria-label={`Remove child task ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-black bg-neon hover:brightness-110 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Preset'}
            </button>
          </div>
        </div>
      )}

      <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-5 text-sm text-gray-500 text-center">
            Loading presets...
          </div>
        ) : presets.length === 0 ? (
          <div className="p-8 text-sm text-gray-500 text-center">
            No task presets yet
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center justify-between gap-3 p-4 hover:bg-white/2 group ${
                  editingId === preset.id ? 'bg-white/5' : ''
                }`}
              >
                <button
                  onClick={() => startEdit(preset)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-200 truncate">
                      {preset.label}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                      {preset.children.length} tasks
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {preset.children
                      .map((child) => child.title_suffix)
                      .join(' · ') || 'No child tasks'}
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(preset)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(preset)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Delete preset"
                    aria-label={`Delete ${preset.label}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {statusMenu &&
        createPortal(
          <div
            data-preset-status-menu
            className="noir-subglass fixed z-[1000] p-1.5 rounded-xl flex flex-col gap-1"
            style={{
              top: statusMenu.top,
              left: statusMenu.left,
              width: statusMenu.width,
            }}
          >
            {PRESET_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  const child = form.children[statusMenu.index];
                  updateChild(statusMenu.index, {
                    default_status:
                      status === 'INBOX' && child.default_status === null
                        ? null
                        : status,
                  });
                  setStatusMenu(null);
                }}
                className={`p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                  (form.children[statusMenu.index]?.default_status || 'INBOX') ===
                  status
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`}
                />
                <span className="text-xs font-medium">{status}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </section>
  );
}
