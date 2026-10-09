'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Save,
  Loader2,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Calendar,
  AlignLeft,
  ChevronDown,
  Tag,
  Link as LinkIcon,
} from 'lucide-react';
import { LifeItem } from '@/types';
import { atlasFetch } from '@/utils/api';
import { getStatusColor, getNotionLinkById } from '@/utils/utils';

const STATUSES = ['INBOX', 'Waiting', 'Going', 'Done'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Partial<LifeItem> | null;
  initialValues?: Partial<LifeItem> | null;
}

export default function DetailModal({
  isOpen,
  onClose,
  item,
  initialValues,
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
    prefs: [],
    imageUrl: '',
    iconType: 'leaf',
    source: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // アニメーション制御用のState
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const values = item ?? initialValues;
      setFormData({
        id: values?.id || '',
        title: values?.title || '',
        status: values?.status || 'INBOX',
        date: values?.date ? values.date.split('T')[0] : null,
        area: 'Life',
        type: values?.type || 'Event',
        topics: values?.topics || [],
        flags: values?.flags || [],
        fkw: values?.fkw || [],
        note: values?.note || '',
        url: values?.url || '',
        prefs: values?.prefs || [],
        imageUrl: values?.imageUrl || '',
        iconType: 'leaf',
        source: values?.source || 'NOTION',
      });
    }
  }, [isOpen, item, initialValues]);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setIsStatusMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isRendered || !formData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const isEditing = item !== null;
    const url = isEditing ? `/pieces/${formData.id}` : '/pieces';
    const method = isEditing ? 'PATCH' : 'POST';

    const payload = {
      title: formData.title || 'No Title',
      status: formData.status || 'INBOX',
      date: formData.date || null,
      area: formData.area,
      type: formData.type || 'Note',
      topics: formData.topics || [],
      flags: formData.flags,
      fkw: formData.fkw || [],
      note: formData.note || '',
      url: formData.url || null,
      source: formData.source,
    };
    try {
      const res = await atlasFetch(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onClose();
      }
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id || isDeleting) return;
    if (!window.confirm('このアイテムを削除しますか？')) return;

    setIsDeleting(true);
    try {
      const response = await atlasFetch(`/pieces/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(
          `Failed to delete item: ${response.status} ${response.statusText}`,
        );
      }
      onClose();
    } catch (error) {
      console.error('Delete failed', error);
      window.alert('アイテムの削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };

  const isSaveBtnNeeds =
    !item || (formData.source === 'NOTION' && Boolean(formData.id));

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
          <div className="flex gap-2">
            <input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Title"
              className="w-full font-bold text-2xl text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            {item && formData.source === 'NOTION' && formData.id && (
              <button
                onClick={() =>
                  window.open(getNotionLinkById(formData.id, 'notion'), '_self')
                }
                className="z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-white shadow-sm transition-all shrink-0"
                title="Open in Notion"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            {item?.id && (
              <div className="relative shrink-0" ref={moreMenuRef}>
                <button
                  type="button"
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={isMoreMenuOpen}
                  onClick={() => setIsMoreMenuOpen((open) => !open)}
                  className="z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white shadow-sm transition-all"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {isMoreMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 z-20 w-40 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isDeleting}
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        void handleDelete();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {!item && (
            <div className="flex items-center gap-3">
              <div
                role="group"
                aria-label="Source"
                className="relative flex w-full rounded-xl bg-gray-100 p-1"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-200 ${
                    formData.source === 'NOTION' ? 'translate-x-full' : ''
                  }`}
                />
                {(['LOCAL', 'NOTION'] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    aria-pressed={formData.source === source}
                    onClick={() => setFormData({ ...formData, source })}
                    className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                      formData.source === source
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Date */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                aria-label="Date"
                type="date"
                value={formData.date?.split('T')[0] || ''}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full min-w-0 box-border appearance-none bg-gray-50 py-3 pl-9 pr-2 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100"
              />
            </div>

            {(formData.source === 'NOTION' || formData.source === 'LOCAL') && (
              <div className="relative flex-1 min-w-0" ref={statusMenuRef}>
                <button
                  type="button"
                  aria-label="State"
                  aria-expanded={isStatusMenuOpen}
                  onClick={() => setIsStatusMenuOpen((open) => !open)}
                  className={`w-full p-3 rounded-xl border bg-gray-50 text-gray-700 flex items-center justify-between transition-colors focus:outline-none ${
                    isStatusMenuOpen
                      ? 'border-gray-400'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusColor(formData.status)}`}
                    />
                    <span className="text-sm font-medium truncate">
                      {formData.status}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      isStatusMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isStatusMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="State"
                    className="absolute left-0 right-0 z-20 mt-2 p-1.5 rounded-xl border border-gray-100 bg-white shadow-xl flex flex-col gap-1"
                  >
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="option"
                        aria-selected={formData.status === status}
                        onClick={() => {
                          setFormData({ ...formData, status });
                          setIsStatusMenuOpen(false);
                        }}
                        className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${
                          formData.status === status
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`}
                        />
                        <span className="text-sm font-medium">{status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Type */}
          {(formData.source === 'NOTION' || formData.source === 'LOCAL') && (
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                aria-label="Type"
                value={formData.type || 'Event'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full bg-gray-50 py-3 pl-11 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 appearance-none"
              >
                <option value="Task">Task</option>
                <option value="Event">Event</option>
                <option value="Note">Note</option>
              </select>
            </div>
          )}
          {/* Note */}
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <textarea
              value={formData.note || ''}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Add a note..."
              className="w-full bg-gray-50 py-3 pl-11 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 min-h-20 resize-none"
            />
          </div>

          {/* URL */}
          <div className="flex w-full gap-2">
            <div className="relative flex-1 min-w-0">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                value={formData.url || ''}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://..."
                className="w-full bg-gray-50 py-3 pl-11 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100"
              />
            </div>
            {formData.url && (
              <button
                onClick={() => window.open(formData.url, '_blank')}
                className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
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
              disabled={isSaving || isDeleting}
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
