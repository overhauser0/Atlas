'use client';

import { FolderKanban, Search, Trash2, X } from 'lucide-react';
import type { Task } from '@/types';

interface ParentTaskPickerModalProps {
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  currentParentId: string | null;
  candidates: Task[];
  onSelectParent: (parentId: string | null) => void;
  onClose: () => void;
}

export default function ParentTaskPickerModal({
  searchQuery,
  onChangeSearchQuery,
  currentParentId,
  candidates,
  onSelectParent,
  onClose,
}: ParentTaskPickerModalProps) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="noir-glass w-full max-w-md rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/50">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="プロジェクトを検索..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-600"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-75 overflow-y-auto p-2 noir-scrollbar bg-black/20">
          {currentParentId && (
            <button
              type="button"
              onClick={() => {
                onSelectParent(null);
                onClose();
              }}
              className="w-full text-left p-3 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-3 transition-colors mb-2"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              プロジェクト設定を解除する
            </button>
          )}

          {candidates.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              タスクが見つかりません
            </div>
          ) : (
            <div className="space-y-1">
              {candidates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectParent(t.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors group"
                >
                  <FolderKanban
                    className={`w-4 h-4 shrink-0 ${
                      currentParentId === t.id
                        ? 'text-emerald-400'
                        : 'text-violet-500/50 group-hover:text-violet-400'
                    }`}
                  />
                  <span className="truncate flex-1">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
