'use client';
import { AlertTriangle, X } from 'lucide-react';

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
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="noir-glass w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-500/20 text-violet-400 rounded-full shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <div className="text-sm text-zinc-400 leading-relaxed">
                {message}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
