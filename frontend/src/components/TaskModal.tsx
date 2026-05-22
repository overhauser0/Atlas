'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, LinkIcon, Text, Calendar } from 'lucide-react';
import { Task } from '@/types';
import { getStatusColor } from '@/utils/dateUtils';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task: Task | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TaskModal({
  isOpen,
  mode,
  task,
  onClose,
  onSuccess,
}: TaskModalProps) {
  const [editForm, setEditForm] = useState({
    title: '',
    status: 'INBOX',
    due_date: '',
    source: 'LOCAL',
    id: '',
    url: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setEditForm({
          title: task.title || '',
          status: task.status || 'INBOX',
          due_date: task.due_date ? task.due_date.split('T')[0] : '',
          source: task.source || 'LOCAL',
          id: task.id || '',
          url: task.url || '',
        });
      } else {
        setEditForm({
          title: '',
          status: 'INBOX',
          due_date: new Date().toISOString().split('T')[0],
          source: 'LOCAL',
          id: '',
          url: '',
        });
      }
    }
  }, [isOpen, mode, task]);

  // モーダルが開いた時にフォーカスを当てる
  useEffect(() => {
    if (isOpen) {
      // モーダルのDOMが描画されるのを少し待ってからフォーカスする
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escキーでモーダルを閉じる関数
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!editForm.title.trim()) return alert('タイトルを入力してください');
    setIsSaving(true);

    try {
      const isEdit = mode === 'edit' && task;
      const payloadDate = editForm.due_date || null;
      const url = isEdit ? `/api/v1/tasks/${task.id}` : '/api/v1/tasks';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        title: editForm.title,
        status: editForm.status,
        dueDate: payloadDate,
        source: isEdit ? task.source : editForm.source,
        url: editForm.url || null,
      };

      console.log('Saving task with payload:', payload);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);

      console.log('Task saved successfully', await response.json());

      onSuccess();
      onClose();
    } catch (e) {
      console.warn(e);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md noir-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white flex-1">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          {editForm.source === 'NOTION' && task?.id && (
            <a
              href={`https://notion.so/${task.id.replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {mode === 'create' && (
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
              {(['LOCAL', 'NOTION'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, source: src })}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.2em] transition-all ${
                    editForm.source === src
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Text className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 pl-9 text-white text-sm focus:border-neon focus:outline-none"
              placeholder="Task title..."
              ref={titleInputRef}
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="date"
              value={editForm.due_date}
              onChange={(e) =>
                setEditForm({ ...editForm, due_date: e.target.value })
              }
              className="noir-input pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['INBOX', 'Waiting', 'Going', 'Done'].map((s) => (
              <button
                key={s}
                onClick={() => setEditForm({ ...editForm, status: s })}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${editForm.status === s ? 'bg-white/10 border-white/30 text-white' : 'border-white/5 text-gray-400'}`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${getStatusColor(s)}`}
                />
                <span className="text-xs">{s}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="url"
                value={editForm.url}
                onChange={(e) =>
                  setEditForm({ ...editForm, url: e.target.value })
                }
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-neon focus:outline-none"
                placeholder="https://... (optional)"
              />
            </div>
            {editForm.url && (
              <a
                href={editForm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
                title="リンクを開く"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-neon text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Task'}
        </button>
      </div>
    </div>
  );
}
