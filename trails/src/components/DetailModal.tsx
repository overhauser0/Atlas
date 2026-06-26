'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  ExternalLink,
  Calendar,
  AlignLeft,
  ListTodo,
  Link as LinkIcon,
} from 'lucide-react';
import { LifeItem } from '@/types';
import { atlasFetch } from '@/utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  item: LifeItem | null;
  defaultFlags: string[];
  onUpdate: () => void;
}

export default function DetailModal({
  isOpen,
  onClose,
  mode,
  item,
  defaultFlags,
  onUpdate,
}: Props) {
  const [formData, setFormData] = useState<LifeItem>({
    id: '',
    title: '',
    status: 'INBOX',
    date: null,
    area: 'Life',
    type: null,
    topics: [],
    flags: [],
    fkw: [],
    note: '',
    url: '',
    imageUrl: '',
    iconType: 'leaf',
    source: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // アニメーション制御用のState
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData({ ...item });
      } else {
        setFormData({
          id: '',
          title: '',
          status: 'INBOX',
          date: null,
          area: 'Life',
          type: null,
          topics: [],
          flags: defaultFlags,
          fkw: [],
          note: '',
          url: '',
          imageUrl: '',
          iconType: 'leaf',
          source: '',
        });
      }
    }
  }, [isOpen, mode, item, defaultFlags]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true); // まずDOMを描画
      // 描画直後にアニメーションを発火させるため、わずかな遅延を入れる
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false); // アニメーション（閉じる）を開始
      // アニメーション完了（300ms）を待ってからDOMを消す
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered || !formData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const url = mode === 'edit' ? `/pieces/${formData.id}` : '/pieces';
    const method = mode === 'edit' ? 'PATCH' : 'POST';

    const payload = {
      title: formData.title,
      status: formData.status,
      note: formData.note,
      date: formData.date,
      source: 'NOTION',
      url: formData.url || null,
    };
    try {
      const res = await atlasFetch(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        //onUpdate();
        onClose();
      }
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveBtnNeeds =
    mode === 'create' ||
    (mode === 'edit' && formData.source === 'NOTION' && formData.id);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ease-in-out ${
        isVisible
          ? 'bg-black/40 backdrop-blur-sm opacity-100'
          : 'bg-black/0 opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative bg-white w-full max-w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isVisible
            ? 'translate-y-0 sm:scale-100 sm:opacity-100'
            : 'translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()} // 中身のクリックでは閉じないようにする
      >
        <div className="overflow-y-auto flex-1 p-6 no-scrollbar flex flex-col gap-4">
          {/* 画像 */}
          {formData.imageUrl && (
            <div className="-mx-6 -mt-6 mb-6 h-56 relative bg-gray-100">
              <img
                src={formData.imageUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <div className="flex">
            <input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Title"
              className="w-full font-bold text-2xl text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            {mode === 'edit' && formData.source === 'NOTION' && formData.id && (
              <button
                onClick={() =>
                  window.open(
                    `https://notion.so/${formData.id.replace(/-/g, '')}`,
                    '_blank',
                  )
                }
                className="z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-white shadow-sm transition-all shrink-0"
                title="Open in Notion"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="date"
              value={formData.date?.split('T')[0] || ''}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full bg-gray-50 p-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100"
            />
          </div>

          {/* Note */}
          <div className="flex items-start gap-3">
            <AlignLeft className="w-5 h-5 text-gray-400 shrink-0 mt-2" />
            <textarea
              value={formData.note || ''}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Add a note..."
              className="w-full bg-gray-50 p-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 min-h-20 resize-none"
            />
          </div>

          {/* URL */}
          <div className="flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex w-full gap-2">
              <input
                value={formData.url || ''}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://..."
                className="flex-1 bg-gray-50 p-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 min-w-0"
              />
              {formData.url && (
                <button
                  onClick={() => window.open(formData.url, '_blank')}
                  className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <ListTodo className="w-5 h-5 text-gray-400 shrink-0" />
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full bg-gray-50 p-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 appearance-none"
            >
              <option value="INBOX">INBOX</option>
              <option value="Waiting">Waiting</option>
              <option value="Going">Going</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* fkw array */}
          {formData.fkw && formData.fkw.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.fkw.map((tag) => (
                <span key={tag} className="trails-badge">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ==== 下部ボタン ==== */}
        <div className="p-6 pt-4 border-t border-gray-100 bg-white flex gap-3">
          {isSaveBtnNeeds && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
