'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Repeat,
  Plus,
  Trash2,
  Save,
  X,
  Calendar,
  CalendarClock,
} from 'lucide-react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/ui/Toast';

export interface RoutineTask {
  id?: number;
  title: string;
  frequency: 'weekly' | 'monthly';
  type: 'date' | 'nthWeekday' | null;
  day: number | null;
  week: number | null;
  day_of_week: number | null;
  note: string;
  url: string;
  is_active: boolean;
}

const DEFAULT_ROUTINE: RoutineTask = {
  title: '',
  frequency: 'weekly',
  type: null,
  day: null,
  week: null,
  day_of_week: null,
  note: '',
  url: '',
  is_active: true,
};

// JSのgetDay()に合わせた曜日定義
const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const GRID_ROWS = [
  { id: 'weekly', label: 'Weekly', freq: 'weekly', type: null, week: null },
  { id: 'w1', label: 'Week 1', freq: 'monthly', type: 'nthWeekday', week: 1 },
  { id: 'w2', label: 'Week 2', freq: 'monthly', type: 'nthWeekday', week: 2 },
  { id: 'w3', label: 'Week 3', freq: 'monthly', type: 'nthWeekday', week: 3 },
  { id: 'w4', label: 'Week 4', freq: 'monthly', type: 'nthWeekday', week: 4 },
];

export default function RoutineSettings() {
  const { addToast } = useToast();
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<RoutineTask>>({});
  const [isCreating, setIsCreating] = useState(false);

  const fetchRoutines = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await atlasFetch('/routines');
      if (!response.ok) throw new Error('Failed to fetch routines');
      const data = await response.json();
      setRoutines(data);
    } catch (error) {
      console.error(error);
      addToast('ルーチンの取得に失敗しました', 'alert');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  // --- 手動・直接追加アクション ---
  const handleQuickAdd = (row: (typeof GRID_ROWS)[0], dayValue: number) => {
    setIsCreating(true);
    if (row.freq === 'weekly') {
      setEditData({
        ...DEFAULT_ROUTINE,
        frequency: 'weekly',
        day_of_week: dayValue,
      });
    } else {
      setEditData({
        ...DEFAULT_ROUTINE,
        frequency: 'monthly',
        type: 'nthWeekday',
        week: row.week,
        day_of_week: dayValue,
      });
    }
    setIsModalOpen(true);
  };

  const handleAddDateRoutine = () => {
    setIsCreating(true);
    setEditData({
      ...DEFAULT_ROUTINE,
      frequency: 'monthly',
      type: 'date',
      day: 1,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (routine: RoutineTask) => {
    setIsCreating(false);
    setEditData({ ...routine });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditData({});
  };

  // --- 保存・削除 ---
  const handleSave = async () => {
    if (!editData.title) {
      addToast('Titleは必須です', 'alert');
      return;
    }

    const payload = { ...editData };
    if (payload.frequency === 'weekly') {
      payload.type = null;
      payload.day = null;
      payload.week = null;
      payload.day_of_week = payload.day_of_week ?? 1;
    } else if (payload.frequency === 'monthly') {
      if (payload.type === 'date') {
        payload.week = null;
        payload.day_of_week = null;
      } else if (payload.type === 'nthWeekday') {
        payload.day = null;
      }
    }

    const endpoint = isCreating ? '/routines' : `/routines/${payload.id}`;
    const method = isCreating ? 'POST' : 'PATCH';

    try {
      const response = await atlasFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save routine');

      addToast(isCreating ? '作成しました' : '更新しました', 'info');
      handleCloseModal();
      fetchRoutines();
    } catch (error) {
      console.error(error);
      addToast('保存に失敗しました', 'alert');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('このルーチンを削除しますか？')) return;
    try {
      const response = await atlasFetch(`/routines/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete routine');
      addToast('削除しました', 'info');
      handleCloseModal();
      fetchRoutines();
    } catch (error) {
      console.error(error);
      addToast('削除に失敗しました', 'alert');
    }
  };

  // --- 描画用のデータ分類 ---
  const dateRoutines = [...routines]
    .filter((r) => r.frequency === 'monthly' && r.type === 'date')
    .sort((a, b) => (a.day || 0) - (b.day || 0));

  const getRoutinesForCell = (
    freq: string,
    week: number | null,
    dayValue: number,
  ) => {
    return routines.filter((r) => {
      if (freq === 'weekly') {
        return r.frequency === 'weekly' && r.day_of_week === dayValue;
      }
      return (
        r.frequency === 'monthly' &&
        r.type === 'nthWeekday' &&
        r.week === week &&
        r.day_of_week === dayValue
      );
    });
  };

  const getTheme = (frequency?: 'weekly' | 'monthly', is_active?: boolean) => {
    if (!is_active)
      return {
        color: 'white',
        text: 'text-white/10',
        bg: 'bg-white/5',
        border: 'border-white/10',
      };
    return frequency === 'monthly'
      ? {
          color: 'sky',
          text: 'text-sky-500',
          bg: 'bg-sky-500/10',
          border: 'border-sky-500/30',
        }
      : {
          color: 'emerald',
          text: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
        };
  };

  return (
    <>
      {isLoading ? (
        <div className="p-8 text-sm text-gray-500 text-center noir-glass rounded-2xl border border-white/5">
          Loading routines...
        </div>
      ) : (
        <>
          <section className="flex flex-col pb-4 gap-6 max-w-5xl">
            <h2 className="flex items-center gap-2 px-1 noir-label">
              <CalendarClock className="w-4 h-4" /> Weekly Task
            </h2>
            {/* =========================================
              Top Section: Weekly & Nth Weekday Grid
            ========================================= */}
            <div className="noir-glass rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="overflow-x-auto noir-scrollbar pb-1">
                <div className="w-max">
                  {/* Header Row */}
                  <div className="grid grid-cols-[80px_repeat(7,100px)] md:grid-cols-[80px_repeat(7,140px)] bg-white/5 border-b border-white/10 text-xs font-bold text-gray-400">
                    <div className="p-2 text-center border-r border-white/10"></div>
                    {DAYS.map((d) => (
                      <div
                        key={d.value}
                        className="p-2 text-center border-r border-white/10 last:border-r-0 uppercase tracking-wider"
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>

                  {/* Data Rows */}
                  {GRID_ROWS.map((row, rowIndex) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[80px_repeat(7,100px)] md:grid-cols-[80px_repeat(7,140px)] border-b border-white/10 last:border-b-0"
                    >
                      {/* Row Label */}
                      <div className="p-2 flex items-center justify-center font-bold text-[10px] text-gray-400 border-r border-white/10 bg-white/2 uppercase text-center tracking-wider leading-tight">
                        {row.label}
                      </div>
                      {/* Cells */}
                      {DAYS.map((day) => {
                        const cellRoutines = getRoutinesForCell(
                          row.freq,
                          row.week,
                          day.value,
                        );
                        return (
                          <div
                            key={day.value}
                            className="p-1.5 border-r border-white/10 last:border-r-0 min-h-15 group flex flex-col gap-1.5 hover:bg-white/2 transition-colors relative"
                          >
                            {cellRoutines.map((r) => {
                              const theme = getTheme(r.frequency, r.is_active);
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => handleEdit(r)}
                                  className={`text-left p-1.5 rounded-lg border ${theme.border} ${theme.bg} hover:brightness-70 transition-all group/card`}
                                >
                                  <div
                                    className={`text-[10px] font-bold leading-tight truncate overflow-hidden ${!r.is_active && 'opacity-40 line-through'}`}
                                  >
                                    {r.title}
                                  </div>
                                </button>
                              );
                            })}
                            {/* Quick Add Button */}
                            <button
                              onClick={() => handleQuickAdd(row, day.value)}
                              className="mt-auto mx-auto w-6 h-6 rounded-full bg-white/5 hover:bg-white/20 text-gray-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-dashed border-white/20"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =========================================
              Bottom Section: Date-based Monthly List
          ========================================= */}
          <section className="flex flex-col gap-6 max-w-5xl">
            <h2 className="flex items-center gap-2 px-1 noir-label">
              <Calendar className="w-4 h-4" /> Day Task
            </h2>
            <div className="noir-glass rounded-2xl border border-white/5 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={handleAddDateRoutine}
                  className="text-xs flex items-center gap-1 font-bold text-sky-500 hover:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg transition-colors border border-sky-500/20 uppercase tracking-wider"
                >
                  <Plus className="w-3 h-3" /> Add Day Task
                </button>
              </div>

              {dateRoutines.length === 0 ? (
                <div className="text-xs text-gray-500 p-4 text-center">
                  No Day Tasks
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dateRoutines.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleEdit(r)}
                      className="flex items-center bg-black/40 border border-sky-500/20 rounded-xl p-3 hover:bg-white/5 hover:border-sky-500/50 transition-all text-left"
                    >
                      <div className="w-12 shrink-0 text-center border-r border-white/10 pr-3">
                        <div className="text-2xl font-black text-sky-500 tracking-tighter">
                          {r.day}
                        </div>
                        <div className="text-[9px] font-bold text-sky-500/60 uppercase tracking-wider">
                          Day
                        </div>
                      </div>
                      <div className="flex-1 pl-3 min-w-0">
                        <div
                          className={`text-sm font-bold text-gray-200 truncate ${!r.is_active && 'opacity-40 line-through'}`}
                        >
                          {r.title}
                        </div>
                        {r.note && (
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            {r.note}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* =========================================
          Edit/Create Modal
      ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/2">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                {isCreating ? (
                  <Plus className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Repeat className="w-4 h-4 text-sky-500" />
                )}
                {isCreating ? 'New Routine' : 'Edit Routine'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] noir-scrollbar">
              {/* Context Info (Read Only appearance for matrix context) */}
              <div className="flex gap-4 text-sm font-mono text-gray-400  p-2.5 border-b border-white/5">
                <span className="uppercase text-white/70 font-bold">
                  {editData.frequency}
                </span>
                {editData.frequency === 'weekly' ? (
                  <span>
                    {DAYS.find((d) => d.value === editData.day_of_week)?.label}
                  </span>
                ) : editData.type === 'date' ? (
                  <div className="flex items-center gap-2">
                    <span>Day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={editData.day || 1}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          day: Number(e.target.value),
                        })
                      }
                      className="bg-transparent border-b border-white/20 w-10 text-center text-white focus:border-sky-500 outline-none px-1"
                    />
                    <span>of month</span>
                  </div>
                ) : (
                  <span>
                    Week {editData.week},{' '}
                    {DAYS.find((d) => d.value === editData.day_of_week)?.label}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                  placeholder="Task Name"
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">
                  Note
                </label>
                <input
                  type="text"
                  value={editData.note || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, note: e.target.value })
                  }
                  placeholder="Optional details"
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:border-emerald-500/50 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">URL</label>
                <input
                  type="text"
                  value={editData.url || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-sm font-mono focus:border-emerald-500/50 outline-none transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <label className="text-sm text-gray-300 cursor-pointer">
                  Active
                </label>
                <ToggleSwitch
                  checked={editData.is_active ?? true}
                  onChange={(p: boolean) =>
                    setEditData({ ...editData, is_active: p })
                  }
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-white/2 flex justify-between items-center">
              {!isCreating && editData.id ? (
                <button
                  onClick={() => handleDelete(editData.id!)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="text-sm font-medium text-gray-500 px-1">
        Tasks are generated every Monday at 9:00 AM.
      </div>
    </>
  );
}
