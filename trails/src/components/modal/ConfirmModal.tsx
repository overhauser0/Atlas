'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'はい',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onConfirm();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trails-confirm-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-full bg-amber-100 p-3 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1 pt-1">
              <h2
                id="trails-confirm-title"
                className="mb-2 text-base font-bold text-gray-900"
              >
                {title}
              </h2>
              <div className="text-sm leading-relaxed text-gray-600">
                {message}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
