'use client';
import { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  LinkIcon,
  Text,
  Calendar,
  MessageSquare,
  Trash2,
  SquareArrowUp,
} from 'lucide-react';
import { Task } from '@/types';
import { getStatusColor } from '@/utils/miscellaneousUtils';
import { useToast } from '@/components/Toast';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task: Task | null;
  initialTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
  onSyncStart: () => void;
  onSyncEnd: () => void;
}

export default function TaskModal({
  isOpen,
  mode,
  task,
  initialTitle = '',
  onClose,
  onSuccess,
  onSyncStart,
  onSyncEnd,
}: TaskModalProps) {
  const { addToast } = useToast();

  const [editForm, setEditForm] = useState({
    title: '',
    note: '',
    status: 'INBOX',
    date: '',
    source: 'LOCAL',
    id: '',
    url: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const focusTitleInput = () => {
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setEditForm({
          title: task.title || '',
          note: task.note || '',
          status: task.status || 'INBOX',
          date: task.date ? task.date.split('T')[0] : '',
          source: task.source || 'LOCAL',
          id: task.id || '',
          url: task.url || '',
        });
        if ((task.title || '') === '') focusTitleInput();
      } else {
        setEditForm({
          title: initialTitle || '',
          note: '',
          status: 'INBOX',
          date: new Date().toISOString().split('T')[0],
          source: 'LOCAL',
          id: '',
          url: '',
        });
        if ((initialTitle || '') === '') focusTitleInput();
      }
    }
  }, [isOpen, mode, task]);

  const handleSave = () => {
    if (!editForm.title.trim()) return alert('タイトルを入力してください');

    const isEdit = mode === 'edit' && task;
    const payloadDate = editForm.date || null;
    const url = isEdit ? `/api/v1/pieces/${task.id}` : '/api/v1/pieces';
    const method = isEdit ? 'PATCH' : 'POST';

    const payload = {
      title: editForm.title,
      note: editForm.note,
      status: editForm.status,
      date: payloadDate,
      source: isEdit ? task.source : editForm.source,
      url: editForm.url || null,
    };

    onClose();
    onSyncStart();

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Server Error: ${response.statusText}`);
        onSuccess();
        addToast('タスクを保存しました', 'info');
      })
      .catch((e) => {
        console.warn(e);
        addToast('タスクの保存に失敗しました', 'alert');
      })
      .finally(() => {
        onSyncEnd();
      });
  };

  const handleDelete = () => {
    if (!task?.id) return;

    if (!window.confirm('本当にこのタスクを削除しますか？')) {
      return;
    }

    onClose();
    onSyncStart();

    fetch(`/api/v1/pieces/${task.id}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
      },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Server Error: ${response.statusText}`);
        onSuccess();
        addToast('タスクを削除しました', 'info');
      })
      .catch((e) => {
        console.warn(e);
        addToast('タスクの削除に失敗しました', 'alert');
      })
      .finally(() => {
        onSyncEnd();
      });
  };

  const handlePromote = async () => {
    if (!task?.id) return;

    if (!window.confirm('このタスクをNotionに昇格させますか？')) {
      return;
    }

    onClose();
    onSyncStart();

    try {
      const response = await fetch(`/api/v1/pieces/${task.id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server Error: ${response.status}`,
        );
      }

      addToast('タスクを昇格させました', 'info');
      onSuccess();
    } catch (e) {
      console.warn(e);
      addToast('タスクの昇格に失敗しました', 'alert');
    } finally {
      onSyncEnd();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Esc: モーダルを閉じる
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // 2. Ctrl/Cmd + Enter: 保存
      if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
        return;
      }

      // 3. Ctrl/Cmd + P: Promote (Notion昇格)
      if (cmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (editForm.source === 'LOCAL' && mode === 'edit' && task?.id) {
          handlePromote();
        }
        return;
      }

      // 4. Delete: 削除
      if (e.key === 'Delete') {
        const activeEl = document.activeElement;
        const isInputActive =
          activeEl &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (!isInputActive && mode === 'edit' && task?.id) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    mode,
    task,
    editForm,
    onClose,
    handleSave,
    handlePromote,
    handleDelete,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md noir-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6 shadow-[0_0_60px_-15px_rgba(0,112,243,0.15)]">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white flex-1">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          {mode === 'edit' && task?.id && (
            <button
              onClick={handleDelete}
              type="button"
              className="noir-icon-btn hover:text-red-400"
              title="タスクを削除 (Delete)" // 💡 ホバー時のツールチップにショートカットを追加
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {editForm.source === 'LOCAL' && mode === 'edit' && task?.id && (
            <button
              onClick={handlePromote}
              type="button"
              className="noir-icon-btn hover:text-green-400"
              title="Notionに昇格 (Ctrl+P)" // 💡 ホバー時のツールチップにショートカットを追加
            >
              <SquareArrowUp className="w-5 h-5" />
            </button>
          )}
          {editForm.source === 'NOTION' && task?.id && (
            <a
              href={`https://notion.so/${task.id.replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="noir-icon-btn"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="noir-icon-btn"
            title="閉じる (Esc)"
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
          <div className="relative flex w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="date"
              value={editForm.date}
              onChange={(e) =>
                setEditForm({ ...editForm, date: e.target.value })
              }
              className="noir-input pl-9 w-auto flex-1 box-border appearance-none min-w-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['INBOX', 'Waiting', 'Going', 'Done'].map((s) => (
              <button
                key={s}
                onClick={() => setEditForm({ ...editForm, status: s })}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  editForm.status === s
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'border-white/5 text-gray-400'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${getStatusColor(s)}`}
                />
                <span className="text-xs">{s}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </div>
            <textarea
              value={editForm.note}
              onChange={(e) =>
                setEditForm({ ...editForm, note: e.target.value })
              }
              rows={2}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 pl-9 text-white text-sm focus:border-neon focus:outline-none resize-none"
              placeholder="Note... (optional)"
            />
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
          className="w-full bg-neon text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : 'Save Task'}
        </button>
      </div>
    </div>
  );
}
