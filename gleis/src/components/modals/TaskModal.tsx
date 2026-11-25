'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  LinkIcon,
  Text,
  Calendar,
  MessageSquare,
  ChevronDown,
  CornerLeftUp,
  FolderKanban,
} from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import {
  getNotionLinkById,
  getPieceDateRangeUpdate,
  getStatusColor,
} from '@/utils/task';
import { getDateFullString } from '@atlas/shared/date';
import { atlasFetch } from '@atlas/shared/api';
import { triggerHaptics } from '@/lib/haptics';
import { useConfirm } from '@atlas/shared/hooks/useConfirm';
import ApplyTaskPresetModal from '@/components/modals/ApplyTaskPresetModal';
import NotionBlockPanel, {
  type NotionBlock,
} from './task-modal/NotionBlockTree';
import ParentTaskPickerModal from './task-modal/ParentTaskPickerModal';
import TaskModalHeader from './task-modal/TaskModalHeader';

export interface TaskSavePayload {
  title: string;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  type: string;
  topics: string[];
  fkw: string[];
  note: string;
  url: string | null;
  source?: string;
  parent_id: string | null;
}

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task: Partial<Task> | null;
  allTasks: Task[];
  subTaskMap: Record<string, { total: number; done: number }>;
  onClose: () => void;
  onSave: (taskId: string | null, payload: TaskSavePayload) => Promise<void>;
  onSuccess: () => void;
  onSyncStart: () => void;
  onSyncEnd: () => void;
  onSendToPC?: (url: string) => void;
  onShowContent: (id: string, depth?: number) => Promise<NotionBlock[]>;
  onOpenProjectModal: (task: Partial<Task>) => void;
  onOpenFocusModal: (task: Partial<Task>) => void;
  openTaskModal: (task: Task) => void;
  handleGleisLink: (url: string, callback?: () => void) => void;
}

export default function TaskModal({
  isOpen,
  mode,
  task,
  allTasks,
  subTaskMap,
  onClose,
  onSave,
  onSuccess,
  onSyncStart,
  onSyncEnd,
  onSendToPC,
  onShowContent,
  onOpenProjectModal,
  onOpenFocusModal,
  openTaskModal,
  handleGleisLink,
}: TaskModalProps) {
  const { addToast } = useToast();
  const { confirm, confirmProps } = useConfirm();

  const [editForm, setEditForm] = useState<{
    title: string;
    note: string;
    status: TaskStatus;
    start_date: string | null;
    end_date: string | null;
    source: string;
    id: string;
    url: string;
    topics: string[];
    type: string;
    fkw: string[];
    parent_id: string | null;
  }>({
    title: '',
    note: '',
    status: 'INBOX',
    start_date: '',
    end_date: null,
    source: 'LOCAL',
    id: '',
    url: '',
    topics: [],
    type: 'Task',
    fkw: [],
    parent_id: null,
  });
  const [isSaving] = useState(false);
  const [internalMode, setInternalMode] = useState(mode);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isTaskPresetModalOpen, setIsTaskPresetModalOpen] = useState(false);

  const [isParentSelectorOpen, setIsParentSelectorOpen] = useState(false);
  const [parentSearchQuery, setParentSearchQuery] = useState('');

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const focusTitleInput = () => {
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  const [blocks, setBlocks] = useState<NotionBlock[] | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInternalMode(mode);
      setEditForm({
        id: task?.id || '',
        title: task?.title || '',
        status: task?.status || 'INBOX',
        start_date: task?.start_date
          ? task.start_date.slice(0, 10)
          : getDateFullString(new Date(), 'hyphen'),
        end_date: task?.end_date || null,
        type: task?.type || 'Task',
        topics: task?.topics || [],
        fkw: task?.fkw || [],
        note: task?.note || '',
        url: task?.url || '',
        source: task?.source || 'LOCAL',
        parent_id: task?.parent_id || null,
      });
      setIsUrlInputOpen(Boolean(task?.url));
      if ((task?.title || '') === '') focusTitleInput();
    }
    setIsMoreMenuOpen(false);
    setIsStatusMenuOpen(false);
    if (!isOpen) setIsTaskPresetModalOpen(false);
    setShowBlocks(false);
    setIsParentSelectorOpen(false);
  }, [isOpen, mode, task]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setIsStatusMenuOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSave = async () => {
    if (!editForm.title.trim()) return alert('タイトルを入力してください');

    const isEdit = internalMode === 'edit' && task;
    const taskId = isEdit && task.id ? task.id : null;

    const payload: TaskSavePayload = {
      title: editForm.title || 'No Title',
      status: editForm.status || 'INBOX',
      start_date: editForm.start_date || null,
      end_date: editForm.end_date,
      ...(editForm.start_date ? {} : { start_time: null, end_time: null }),
      type: editForm.type || 'Task',
      topics: editForm.topics || [],
      fkw: editForm.fkw || [],
      note: editForm.note || '',
      url: editForm.url || null,
      source: isEdit ? task.source : editForm.source || 'LOCAL',
      parent_id: editForm.parent_id,
    };

    onClose();
    onSyncStart();

    try {
      await onSave(taskId, payload);
      onSuccess();
      if (payload.status === 'Done') triggerHaptics(12);
      addToast('タスクを保存しました', 'info');
    } catch (e) {
      console.warn(e);
      addToast('タスクの保存に失敗しました', 'alert');
    } finally {
      onSyncEnd();
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    if (
      !(await confirm(
        'タスク削除確認',
        <>タスクを削除しますか？</>,
        '削除する',
        'キャンセル',
      ))
    )
      return;

    onClose();
    onSyncStart();

    atlasFetch(`/pieces/${task.id}`, { method: 'DELETE' })
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
    if (
      !(await confirm(
        'タスク昇格確認',
        <>タスクをNotionに昇格させますか？</>,
        '昇格する',
        'キャンセル',
      ))
    )
      return;

    onSyncStart();

    try {
      const response = await atlasFetch(`/pieces/${task.id}/promote`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData: { message?: string } = await response
          .json()
          .catch(() => ({}));
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

  const handleDuplicate = () => {
    if (!task?.id) return;
    setInternalMode('create');
    setEditForm((prev) => ({
      ...prev,
      id: '',
    }));
    addToast('タスクを複製しました。編集して保存してください。', 'info');
  };

  const handleShowContent = async (id: string | undefined) => {
    if (!id) return;
    setIsLoadingBlocks(true);
    onSyncStart();
    try {
      const blocksWithChildren = await onShowContent(id, 2);
      setBlocks(blocksWithChildren || []);
      setShowBlocks(true);
    } catch {
      addToast('コンテンツの取得に失敗しました', 'alert');
    } finally {
      setIsLoadingBlocks(false);
      onSyncEnd();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isParentSelectorOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Delete') {
        const activeEl = document.activeElement;
        const isInputActive =
          activeEl &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (!isInputActive && internalMode === 'edit' && task?.id) {
          e.preventDefault();
          void handleDelete();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isTaskPresetModalOpen) {
          setIsTaskPresetModalOpen(false);
          return;
        }
        if (isMoreMenuOpen || isStatusMenuOpen) {
          setIsMoreMenuOpen(false);
          setIsStatusMenuOpen(false);
          return;
        }
        onClose();
        return;
      }

      if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (
          editForm.source === 'LOCAL' &&
          internalMode === 'edit' &&
          task?.id
        ) {
          void handlePromote();
        }
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'o') {
        if (editForm.source === 'NOTION' && task?.id) {
          e.preventDefault();
          window.location.assign(getNotionLinkById(task.id, 'notion'));
        }
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'e') {
        if (onSendToPC && editForm.source === 'NOTION' && task?.id) {
          e.preventDefault();
          onSendToPC(getNotionLinkById(task.id, 'https'));
          onClose();
        }
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setEditForm({ ...editForm, status: 'Done' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isParentSelectorOpen,
    internalMode,
    task,
    editForm,
    onClose,
    isMoreMenuOpen,
    isStatusMenuOpen,
    isTaskPresetModalOpen,
    onSendToPC,
  ]);

  if (!isOpen) return null;

  const currentParentTask = editForm.parent_id
    ? allTasks.find((t) => t.id === editForm.parent_id)
    : null;

  const countData = task?.id ? subTaskMap[task.id] : null;
  const completedCount = countData?.done || 0;
  const totalCount = countData?.total || 0;

  const filteredPossibleParents = allTasks.filter((t) => {
    if (t.id === task?.id) return false;
    if (!parentSearchQuery) return true;
    return t.title.toLowerCase().includes(parentSearchQuery.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="noir-glass w-full max-w-md rounded-2xl p-6 flex flex-col gap-6 relative transition-all duration-300">
        <TaskModalHeader
          internalMode={internalMode}
          source={editForm.source}
          task={task}
          isMoreMenuOpen={isMoreMenuOpen}
          isLoadingBlocks={isLoadingBlocks}
          moreMenuRef={moreMenuRef}
          onToggleMoreMenu={() => setIsMoreMenuOpen((prev) => !prev)}
          onCloseMoreMenu={() => setIsMoreMenuOpen(false)}
          onClose={onClose}
          onSendToPC={onSendToPC}
          onOpenFocusModal={onOpenFocusModal}
          onOpenParentSelector={() => setIsParentSelectorOpen(true)}
          onOpenPresetModal={() => setIsTaskPresetModalOpen(true)}
          onDelete={() => void handleDelete()}
          onShowContent={(id) => void handleShowContent(id)}
          onPromote={() => void handlePromote()}
          onDuplicate={handleDuplicate}
        />

        {/* === BODY === */}
        <div className="flex flex-col gap-4">
          {internalMode === 'create' && (
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

          {currentParentTask && (
            <div className="flex items-center -mb-2 pl-1">
              <button
                type="button"
                onClick={() => openTaskModal(currentParentTask)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-all group"
                title="親プロジェクトを開く"
              >
                <CornerLeftUp className="w-3.5 h-3.5 text-orange-400 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
                <span className="truncate max-w-70 underline-offset-4 group-hover:underline">
                  {currentParentTask.title}
                </span>
              </button>
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

          <div className="flex items-center gap-3">
            <div className="relative flex flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="date"
                value={editForm.start_date || ''}
                onChange={(e) => {
                  const dateUpdates = getPieceDateRangeUpdate(
                    editForm.start_date,
                    editForm.end_date,
                    e.target.value,
                  );
                  setEditForm({ ...editForm, ...dateUpdates });
                }}
                className="noir-input pl-9 w-full box-border appearance-none min-w-0"
              />
            </div>

            <div className="relative flex-1" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                title="ステータス (Ctrl+DでDone)"
                className={`w-full p-3 rounded-xl border bg-black/50 text-white flex items-center justify-between transition-colors focus:outline-none ${
                  isStatusMenuOpen
                    ? 'border-neon'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${getStatusColor(editForm.status)}`}
                  />
                  <span className="text-sm tracking-wide font-medium">
                    {editForm.status}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
                    isStatusMenuOpen ? 'rotate-180 text-neon' : ''
                  }`}
                />
              </button>

              {isStatusMenuOpen && (
                <div className="noir-subglass absolute left-0 right-0 z-60 mt-2 p-1.5 rounded-xl flex flex-col gap-1">
                  {(['INBOX', 'Waiting', 'Going', 'Wrapper', 'Done'] as const).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, status: s });
                          setIsStatusMenuOpen(false);
                        }}
                        className={`p-3 rounded-lg flex items-center gap-3 transition-all ${
                          editForm.status === s
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${getStatusColor(s)}`}
                        />
                        <span className="text-sm font-medium">{s}</span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
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

          {editForm.url || isUrlInputOpen ? (
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
                  onBlur={() => {
                    if (!editForm.url) setIsUrlInputOpen(false);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-neon focus:outline-none"
                  placeholder="https://... (optional)"
                />
              </div>
              {editForm.url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGleisLink(editForm.url, onClose);
                  }}
                  className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
                  title="開く"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsUrlInputOpen(true)}
              className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="URLを追加"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              URL
              <span className="text-gray-500">+</span>
            </button>
          )}

          {internalMode === 'edit' && (
            <div
              className={
                totalCount > 0
                  ? 'mt-6 border-t border-white/10 pt-4'
                  : 'flex justify-start'
              }
            >
              <button
                type="button"
                onClick={() => onOpenProjectModal(task as Task)}
                className={`flex items-center justify-between transition-colors group ${
                  totalCount > 0
                    ? 'w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5'
                    : 'gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-400 hover:text-white'
                }`}
              >
                <div
                  className={`flex items-center gap-2 ${
                    totalCount > 0
                      ? 'text-sm font-bold text-zinc-300 group-hover:text-white'
                      : ''
                  } transition-colors`}
                >
                  <FolderKanban
                    className={`w-4 h-4 ${
                      totalCount > 0 ? 'text-blue-400' : 'text-zinc-500'
                    }`}
                  />
                  Project Workspace
                  {totalCount === 0 && <span className="text-zinc-500">+</span>}
                </div>

                {totalCount > 0 && (
                  <div
                    className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                      completedCount === totalCount
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-black/30 text-zinc-400 group-hover:text-zinc-300'
                    }`}
                  >
                    {completedCount} / {totalCount} Done
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          title="Save Task (Ctrl+Enter)"
          className="w-full bg-neon text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : 'Save Task'}
        </button>
      </div>

      {showBlocks && (
        <NotionBlockPanel
          blocks={blocks}
          onClose={() => setShowBlocks(false)}
          onFetchChildren={(blockId) => onShowContent(blockId, 1)}
        />
      )}

      {isParentSelectorOpen && (
        <ParentTaskPickerModal
          searchQuery={parentSearchQuery}
          onChangeSearchQuery={setParentSearchQuery}
          currentParentId={editForm.parent_id}
          candidates={filteredPossibleParents}
          onSelectParent={(parentId) =>
            setEditForm({ ...editForm, parent_id: parentId })
          }
          onClose={() => setIsParentSelectorOpen(false)}
        />
      )}

      {task?.id && (
        <ApplyTaskPresetModal
          isOpen={isTaskPresetModalOpen}
          parentTask={{
            id: task.id,
            title: task.title || '',
            start_date: task.start_date || null,
          }}
          onClose={() => setIsTaskPresetModalOpen(false)}
          onApplied={onSuccess}
        />
      )}

      <ConfirmModal {...confirmProps} />
    </div>
  );
}
