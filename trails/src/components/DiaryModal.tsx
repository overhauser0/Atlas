// src/components/DiaryModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DiaryItem } from '@/types';
import { atlasFetch } from '@/utils/api';

interface DiaryModalProps {
  isOpen: boolean;
  diary: DiaryItem | null;
  onClose: () => void;
}

const RATES = ['★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

// Dateオブジェクトを YYYY-MM-DD 形式の文字列にするヘルパー
const formatDateToYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DiaryModal({
  isOpen,
  diary,
  onClose,
}: DiaryModalProps) {
  const [formData, setFormData] = useState<DiaryItem>({
    id: '',
    name: '',
    date: '',
    note: '',
    rate: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // モーダルが開くたびにステートを初期化
  useEffect(() => {
    if (isOpen && diary) {
      setFormData(diary);
    }
  }, [isOpen, diary]);

  const handleSave = async () => {
    setIsSaving(true);

    const payload = {
      name: formData.name || 'No Title',
      rate: formData.rate || '',
      note: formData.note || '',
    };
    try {
      const res = await atlasFetch(`/diaries/${formData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onClose();
      }
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{formData.name}</h3>
            <p className="text-xs text-gray-500">Daily Log</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Rate Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Rate
            </label>
            <div className="flex flex-wrap gap-2">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => setFormData({ ...formData, rate: r })}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    formData.rate === r
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Note
            </label>
            <textarea
              value={formData.note || ''}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="How was your day?"
              className="w-full h-40 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Diary'}
          </button>
        </div>
      </div>
    </div>
  );
}
