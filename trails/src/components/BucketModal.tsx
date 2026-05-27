'use client';

import { useState, useEffect } from 'react';
import { BucketItem } from '@/types';
import {
  X,
  ExternalLink,
  Pen,
  Link as LinkIcon,
  CircleDot,
  Calendar,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: BucketItem | null;
}

export default function BucketModal({ isOpen, onClose, item }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BucketItem>>({});

  useEffect(() => {
    if (isOpen && item) {
      setIsEditing(false); // 開くときは常にViewモード
      setEditForm(item);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    console.log('Saved data:', editForm);
    setIsEditing(false);
    // API送信やToast表示をここに実装
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-6 transition-opacity"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full md:max-w-md rounded-t-[32px] md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 relative flex flex-col max-h-[90vh]">
        {/* Header Image & Tags */}
        <div className="relative h-56 md:h-48 bg-gray-200 shrink-0">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />

          <div className="absolute bottom-4 left-4 flex gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-white/90 backdrop-blur text-gray-800 text-[10px] font-bold uppercase tracking-wider rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode */}
        {!isEditing ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 md:p-8 overflow-y-auto no-scrollbar flex-1">
              <div className="flex items-center gap-4 mb-3 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                  <CircleDot className="w-3 h-3" /> {item.state}
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3 h-3" /> {item.date}
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                {item.title}
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed whitespace-pre-wrap">
                {item.note}
              </p>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors w-full"
              >
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                  <LinkIcon className="w-3 h-3 text-amber-600" />
                </div>
                <span className="truncate">{item.url}</span>
              </a>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-100 flex gap-3 bg-white shrink-0">
              <button className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors flex justify-center items-center gap-2">
                <ExternalLink className="w-4 h-4 text-gray-400" /> Notion
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors flex justify-center items-center gap-2 shadow-[0_4px_12px_rgba(217,119,6,0.2)]"
              >
                <Pen className="w-3 h-3" /> Edit
              </button>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/50">
            <div className="p-6 md:p-8 overflow-y-auto no-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                    State
                  </label>
                  <select
                    value={editForm.state}
                    onChange={(e) =>
                      setEditForm({ ...editForm, state: e.target.value as any })
                    }
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none"
                  >
                    <option value="Idea">Idea</option>
                    <option value="Todo">Todo</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, date: e.target.value })
                    }
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  URL Link
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={editForm.url}
                    onChange={(e) =>
                      setEditForm({ ...editForm, url: e.target.value })
                    }
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-9 text-sm text-gray-900 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pl-1">
                  Note
                </label>
                <textarea
                  rows={4}
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-900 resize-none outline-none"
                ></textarea>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex gap-3 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors shadow-[0_4px_12px_rgba(217,119,6,0.2)]"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
