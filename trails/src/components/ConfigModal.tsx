// src/components/ConfigModal.tsx
import { X, LogOut } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigModal({ isOpen, onClose }: Props) {
  return (
    <>
      {/* 背景のオーバーレイ (クリックで閉じる) */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* スライドインするパネル */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">{/* 将来的に設定項目が増える場所 */}</div>

          <div className="pt-6 border-t border-gray-100">
            <button className="flex items-center gap-3 w-full p-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
