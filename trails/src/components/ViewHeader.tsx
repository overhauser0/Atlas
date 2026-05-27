// src/components/ViewHeader.tsx
import { Settings, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  title: string;
  syncStatus: 'syncing' | 'synced' | 'error';
  onOpenConfig: () => void;
}

export default function ViewHeader({ title, syncStatus, onOpenConfig }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-gray-100/80 backdrop-blur-md px-5 py-4 flex justify-between items-center border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shrink-0">
          <img
            src="/icon.png"
            alt="Trails Icon"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-gray-400">
          {syncStatus === 'syncing' && (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
          {syncStatus === 'synced' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {syncStatus === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <button
          onClick={onOpenConfig}
          className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
