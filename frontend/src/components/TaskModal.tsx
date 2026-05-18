'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setEditForm({
          title: task.title || '',
          status: task.status || 'INBOX',
          due_date: task.due_date ? task.due_date.split('T')[0] : '',
          source: task.source || 'LOCAL',
        });
      } else {
        setEditForm({
          title: '',
          status: 'INBOX',
          due_date: new Date().toISOString().split('T')[0],
          source: 'LOCAL',
        });
      }
    }
  }, [isOpen, mode, task]);

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
      };

      console.log('Saving task with payload:', payload);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md noir-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6 shadow-2xl">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold text-white">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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
          <input
            type="text"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-neon focus:outline-none"
            placeholder="Task title..."
          />
          <input
            type="date"
            value={editForm.due_date}
            onChange={(e) =>
              setEditForm({ ...editForm, due_date: e.target.value })
            }
            className="noir-input"
          />
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
