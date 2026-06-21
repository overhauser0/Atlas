// src/components/ViewHeader.tsx
import { Settings, Loader2, CloudCheck } from 'lucide-react';

interface Props {
  title: string;
  isSyncing: boolean;
  onOpenConfig: () => void;
}

export default function ViewHeader({ title, isSyncing, onOpenConfig }: Props) {
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
          {isSyncing ? (
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          ) : (
            <CloudCheck className="w-5 h-5 text-green-500" />
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
