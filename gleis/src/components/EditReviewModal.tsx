'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string; // 編集対象の名前（例：Business Goal）
  initialValue: string; // 編集前のテキスト
  onSave: (val: string) => Promise<void>;
}

export default function EditReviewModal({
  isOpen,
  onClose,
  title,
  initialValue,
  onSave,
}: EditReviewModalProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setValue(initialValue), [initialValue]);

  // Escキー対応
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg noir-glass rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-neon focus:outline-none resize-none noir-scrollbar"
          placeholder="Enter text here..."
        />

        <button
          disabled={isSaving}
          onClick={async () => {
            setIsSaving(true);
            await onSave(value);
            setIsSaving(false);
            onClose();
          }}
          className="w-full bg-neon text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
