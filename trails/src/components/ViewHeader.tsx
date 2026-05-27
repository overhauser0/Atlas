// src/components/ViewHeader.tsx
import { Settings, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  title: string;
  syncStatus?: 'syncing' | 'synced' | 'error';
  onOpenConfig?: () => void;
}

export default function ViewHeader({
  title,
  syncStatus = 'synced',
  onOpenConfig,
}: Props) {
  return (
    <header className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2.5">
        {/* アイコンをimgタグに変更 */}
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shrink-0">
          <img
            src="/icon.png"
            alt="Trails Icon"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
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

        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center shadow-sm transition-colors shrink-0"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
