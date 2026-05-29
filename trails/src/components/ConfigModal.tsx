'use client';

import { X, LogOut, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  onLogout: () => void;
}

export default function ConfigModal({
  isOpen,
  onClose,
  onSync,
  onLogout,
}: Props) {
  return (
    /* 背景オーバーレイを削除。パネルのみを固定表示 */
    <div
      className={`fixed inset-0 bg-gray-100 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full max-w-5xl mx-auto p-6 md:p-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 設定項目 */}
        <div className="flex-1 space-y-2">
          <button
            onClick={onSync}
            className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-primary-300 transition-colors text-gray-900 font-bold"
          >
            <RefreshCw className="w-5 h-5 text-primary-500" />
            Sync with Notion
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-red-300 transition-colors text-red-600 font-bold"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 p-4">
          Trails v1.0.0
        </div>
      </div>
    </div>
  );
}
