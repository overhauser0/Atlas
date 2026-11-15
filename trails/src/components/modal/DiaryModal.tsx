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

const RATES = [1, 2, 3, 4, 5];

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // モーダルが開くたびにステートを初期化
  useEffect(() => {
    if (isOpen && diary) {
      setFormData({
        ...diary,
        rate: diary.rate ?? null,
        content: diary.content ?? '',
        flag: diary.flag ?? false,
        piece_ids: diary.piece_ids ?? [],
      });
      setSaveError('');
    }
  }, [isOpen, diary]);

  const handleSave = async () => {
    setIsSaving(true);

    const payload = {
      date: formData.date,
      rate: formData.rate,
      content: formData.content,
      flag: formData.flag,
      piece_ids: formData.piece_ids,
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
      onClose();
    } catch (e) {
      console.error('Save failed', e);
      setSaveError(e instanceof Error ? e.message : 'Failed to save diary');
    } finally {
      setIsSaving(false);
    }
  };

  // ショートカットキー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{formData.date}</h3>
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
              {RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setFormData({ ...formData, rate })}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    formData.rate === rate
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {'★'.repeat(rate)}
                  {'☆'.repeat(5 - rate)}
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
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="How was your day?"
              className="w-full h-40 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>
          {saveError && (
            <p role="alert" className="text-sm text-red-600">
              {saveError}
            </p>
          )}
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
