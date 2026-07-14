'use client';

import { X, LogOut, RefreshCw, Calendar } from 'lucide-react';

interface Props {
  isOpen: boolean;
  appSettings: any;
  onClose: () => void;
  onSync: () => void;
  onLogout: () => void;
  onUpdateSettings: (newSettings: any) => void;
}

export default function ConfigModal({
  isOpen,
  appSettings,
  onClose,
  onSync,
  onLogout,
  onUpdateSettings,
}: Props) {
  const showTaskInCal = !!appSettings?.showTaskInCal;

  // トグルが切り替わったときの処理
  const handleToggleTask = () => {
    onUpdateSettings({
      ...appSettings,
      showTaskInCal: !showTaskInCal,
    });
  };

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
          <div className="flex items-center justify-between w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm text-gray-900 font-bold">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span>Show Tasks in Calendar</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTaskInCal}
                onChange={handleToggleTask}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${showTaskInCal ? 'bg-primary-500' : 'bg-gray-200'}`}
              />
              <div
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${showTaskInCal ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </label>
          </div>
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
          Trails v8.0.0
        </div>
      </div>
    </div>
  );
}
