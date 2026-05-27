'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { LifeItem } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  item: LifeItem | null;
  defaultFlags: string[];
  onUpdate: () => void;
}

export default function DetailModal({
  isOpen,
  onClose,
  mode,
  item,
  defaultFlags,
  onUpdate,
}: Props) {
  const [formData, setFormData] = useState<LifeItem>({
    id: '',
    title: '',
    status: 'Todo',
    date: null,
    area: 'Life',
    type: null,
    topics: [],
    flags: [],
    note: '',
    url: '',
    imageUrl: '',
    iconType: 'leaf',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData({ ...item });
      } else {
        // 新規作成時はデフォルトフラグをセット
        setFormData({
          id: '',
          title: '',
          status: 'Todo',
          date: null,
          area: 'Life',
          type: null,
          topics: [],
          flags: defaultFlags,
          note: '',
          url: '',
          imageUrl: '',
          iconType: 'leaf',
        });
      }
    }
  }, [isOpen, mode, item, defaultFlags]);

  if (!isOpen || !formData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const url =
      mode === 'edit' ? `/api/v1/tasks/${formData.id}` : '/api/v1/tasks';
    const method = mode === 'edit' ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-gray-900">Edit Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full font-bold text-xl border-b border-gray-200 pb-2 focus:outline-none"
          />

          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="w-full p-2 bg-gray-50 rounded-lg text-sm"
          >
            <option value="INBOX">INBOX</option>
            <option value="Waiting">Waiting</option>
            <option value="Going">Going</option>
            <option value="Done">Done</option>
          </select>

          <input
            type="date"
            value={formData.date || ''}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-2 bg-gray-50 rounded-lg text-sm"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-8 bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600"
        >
          {isSaving ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
