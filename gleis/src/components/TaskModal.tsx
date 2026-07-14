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
  MonitorUp,
  MoreHorizontal,
  ChevronDown,
  HardDrive,
  Copy,
  FileText,
  Loader2,
} from 'lucide-react';
import { Task, ViewType, isViewType } from '@/types';
import { getStatusColor, getNotionLinkById } from '@/utils/miscellaneousUtils';
import { getDateString } from '@/utils/dateUtils';
import { atlasFetch } from '@/utils/api';
import { useToast } from '@/components/Toast';
import { parseGleisLink } from '@/utils/schemeUtils';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task: Partial<Task> | null;
  onClose: () => void;
  onSuccess: () => void;
  onSyncStart: () => void;
  onSyncEnd: () => void;
  onSendToPC?: (url: string) => void;
  onNavigate: (viewname: ViewType) => void;
  onShowContent: (id: string) => Promise<any[]>;
}

export default function TaskModal({
  isOpen,
  mode,
  task,
  onClose,
  onSuccess,
  onSyncStart,
  onSyncEnd,
  onSendToPC,
  onNavigate,
  onShowContent,
}: TaskModalProps) {
  const { addToast } = useToast();

  const [editForm, setEditForm] = useState<{
    title: string;
    note: string;
    status: string;
    date: string;
    source: string;
    id: string;
    url: string;
    topics: string[];
    type: string;
    fkw: string[];
  }>({
    title: '',
    note: '',
    status: 'INBOX',
    date: '',
    source: 'LOCAL',
    id: '',
    url: '',
    topics: [],
    type: 'Task',
    fkw: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [internalMode, setInternalMode] = useState(mode);

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const focusTitleInput = () => {
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  };

  const [blocks, setBlocks] = useState<any[] | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInternalMode(mode);
      setEditForm({
        id: task?.id || '',
        title: task?.title || '',
        status: task?.status || 'INBOX',
        date: task?.date ? task?.date.split('T')[0] : getDateString(new Date()),
        type: task?.type || 'Task',
        topics: task?.topics || [],
        fkw: task?.fkw || [],
        note: task?.note || '',
        url: task?.url || '',
        source: task?.source || 'LOCAL',
      });
      if ((task?.title || '') === '') focusTitleInput();
    }
    setIsMoreMenuOpen(false);
    setIsStatusMenuOpen(false);
    setShowBlocks(false); // 開き直した時はパネルを閉じる
  }, [isOpen, mode, task]);

  // ドロップダウンの外側をクリックした時に閉じる処理
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
    const url = isEdit ? `/pieces/${task.id}` : '/pieces';
    const method = isEdit ? 'PATCH' : 'POST';

    const payload = {
      title: editForm.title || 'No Title',
      status: editForm.status || 'INBOX',
      date: editForm.date || null,
      type: editForm.type || 'Task',
      topics: editForm.topics || [],
      fkw: editForm.fkw || [],
      note: editForm.note || '',
      url: editForm.url || null,
      source: isEdit ? task.source : editForm.source || 'LOCAL',
    };

    onClose();
    onSyncStart();
    try {
      const response = await atlasFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      onSuccess();
      addToast('タスクを保存しました', 'info');
    } catch (e) {
      console.warn(e);
      addToast('タスクの保存に失敗しました', 'alert');
    } finally {
      onSyncEnd();
    }
  };

  const handleDelete = () => {
    if (!task?.id) return;
    if (!window.confirm('本当にこのタスクを削除しますか？')) return;

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
    if (!window.confirm('このタスクをNotionに昇格させますか？')) return;

    onClose();
    onSyncStart();

    try {
      const response = await atlasFetch(`/pieces/${task.id}/promote`, {
        method: 'POST',
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

  const handleDuplicate = () => {
    if (!task?.id) return;
    setInternalMode('create');
    setEditForm((prev) => ({
      ...prev,
      id: '',
    }));
    addToast('タスクを複製しました。編集して保存してください。', 'info');
  };

  const handleLinkClick = (url: string) => {
    const gleisLink = parseGleisLink(url);

    if (gleisLink) {
      if (gleisLink.type === 'view') {
        if (isViewType(gleisLink.target)) {
          onNavigate?.(gleisLink.target);
          onClose();
        } else {
          console.warn(`無効な画面遷移先です： ${gleisLink.target}`);
        }
      }
      return true;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  };

  // 🌟 ブロック取得処理（ローディング状態を追加）
  const handleShowContent = async (id: string | undefined) => {
    if (!id) return;
    setIsLoadingBlocks(true);
    try {
      const data = await onShowContent(id);
      setBlocks(data || []);
      setShowBlocks(true);
    } catch (error) {
      addToast('コンテンツの取得に失敗しました', 'alert');
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  // Notionブロックからテキストや状態を抽出するヘルパー関数
  const extractBlockText = (block: any) => {
    const type = block.type;
    const hasChildren = block.has_children;

    // ネストがあることを知らせるバッジUI
    const NestedBadge = hasChildren ? (
      <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border border-neon/30 text-neon/80 bg-neon/5 align-middle select-none">
        + NESTED
      </span>
    ) : null;

    // 1. テキストを持たない特殊なブロックのフォールバック
    if (!type || !block[type] || !block[type].rich_text) {
      // 画像やブックマーク、子ページなど
      const fallbackText =
        type === 'image'
          ? '[画像]'
          : type === 'bookmark'
            ? '[ブックマーク]'
            : type === 'child_page'
              ? '[サブページ]'
              : type === 'child_database'
                ? '[インラインデータベース]'
                : type === 'table'
                  ? '[テーブル(表)]'
                  : `[${type || '未対応のブロック'}]`;

      return (
        <span className="block text-xs text-gray-500 italic my-1 p-2 bg-white/5 rounded border border-white/5">
          {fallbackText} {NestedBadge}
        </span>
      );
    }

    // 2. 通常のテキストブロックの処理
    const textContent = block[type].rich_text
      .map((t: any) => t.plain_text)
      .join('');

    switch (type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return (
          <strong className="block text-gray-200 mt-3 mb-1 border-b border-white/10 pb-1">
            {textContent} {NestedBadge}
          </strong>
        );
      case 'bulleted_list_item':
        return (
          <span className="block ml-4 relative before:content-['•'] before:absolute before:-left-3 before:text-gray-500 my-0.5">
            {textContent} {NestedBadge}
          </span>
        );
      case 'numbered_list_item':
        return (
          <span className="block ml-4 my-0.5">
            {textContent} {NestedBadge}
          </span>
        );
      case 'to_do':
        const isChecked = block.to_do.checked;
        return (
          <span
            className={`flex ml-1 my-0.5 items-start gap-2 ${isChecked ? 'text-gray-600 line-through' : ''}`}
          >
            <span className="mt-0.5 shrink-0">{isChecked ? '☑' : '☐'}</span>
            <span>
              {textContent} {NestedBadge}
            </span>
          </span>
        );
      case 'paragraph':
      default:
        if (textContent === '' && !hasChildren) return <br />;
        return (
          <span className="block my-0.5">
            {textContent} {NestedBadge}
          </span>
        );
    }
  };

  // ショートカットキー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 非入力状態でのみ有効
      if (e.key === 'Delete') {
        const activeEl = document.activeElement;
        const isInputActive =
          activeEl &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (!isInputActive && internalMode === 'edit' && task?.id) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }

      // 常に有効

      if (e.key === 'Escape') {
        e.preventDefault();
        // ドロップダウン、ステータスメニュー優先
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
        handleSave();
        return;
      }

      if (cmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (
          editForm.source === 'LOCAL' &&
          internalMode === 'edit' &&
          task?.id
        ) {
          handlePromote();
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
    internalMode,
    task,
    editForm,
    onClose,
    handleSave,
    handlePromote,
    handleDelete,
    isMoreMenuOpen,
    isStatusMenuOpen,
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
      <div className="noir-glass w-full max-w-md rounded-2xl p-6 flex flex-col gap-6 relative transition-all duration-300">
        {/* === HEADER === */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-3">
            <h2 className="text-lg font-bold text-white">
              {internalMode === 'create' ? 'New Task' : 'Edit Task'}
            </h2>
            {internalMode === 'edit' && editForm.source === 'LOCAL' && (
              <HardDrive className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* コンテンツ表示ボタン */}
          {internalMode === 'edit' &&
            task?.id &&
            editForm.source === 'NOTION' && (
              <button
                onClick={() => handleShowContent(task.id)}
                disabled={isLoadingBlocks}
                className={`noir-icon-btn ${showBlocks ? 'bg-white/10 text-white' : ''}`}
                title="ページ内容を表示"
              >
                {isLoadingBlocks ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </button>
            )}

          {/* Notion Link */}
          {editForm.source === 'NOTION' && task?.id && (
            <a
              href={getNotionLinkById(task.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="noir-icon-btn"
              title="Notionで開く"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}

          {/* PCで開く */}
          {onSendToPC && editForm.source === 'NOTION' && task?.id && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (task.id) onSendToPC(getNotionLinkById(task.id));
                onClose();
              }}
              className="noir-icon-btn"
              title="PCで開く"
            >
              <MonitorUp className="w-5 h-5" />
            </button>
          )}

          {/* 三点リーダーメニュー */}
          {internalMode === 'edit' && task?.id && (
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`noir-icon-btn ${isMoreMenuOpen ? 'bg-white/10 text-white' : ''}`}
                title="その他"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {isMoreMenuOpen && (
                <div className="noir-subglass absolute right-0 w-48 z-60 mt-2 py-1.5 rounded-xl">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleDelete();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    削除
                  </button>

                  {editForm.source === 'LOCAL' && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handlePromote();
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-green-400 hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5"
                    >
                      <SquareArrowUp className="w-4 h-4" />
                      Notionに昇格
                    </button>
                  )}
                  {internalMode === 'edit' && task?.id && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleDuplicate();
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5"
                    >
                      <Copy className="w-4 h-4" />
                      複製
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 閉じる */}
          <button
            onClick={onClose}
            className="noir-icon-btn"
            title="閉じる (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* === BODY === */}
        <div className="flex flex-col gap-4">
          {/* Source Select */}
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

          {/* Title Input */}
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
            {/* Date Input */}
            <div className="relative flex flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="date"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
                className="noir-input pl-9 w-full box-border appearance-none min-w-0"
              />
            </div>

            {/* ステータスカスタムドロップダウン */}
            <div className="relative flex-1" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
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
                  {['INBOX', 'Waiting', 'Going', 'Done'].map((s) => (
                    <button
                      key={s}
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Note Input */}
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

          {/* URL Input */}
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
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLinkClick(editForm.url);
                }}
                className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
                title="開く"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="w-full bg-neon text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : 'Save Task'}
        </button>
      </div>

      {/* ブロック表示用のサイドパネル */}
      {showBlocks && (
        <div className="absolute right-0 top-0 bottom-0 w-80 md:w-96 noir-subglass border-l border-white/10 p-5 z-[60] shadow-2xl animate-fade-in flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10 shrink-0">
            <h3 className="font-bold text-gray-200">Content</h3>
            <button
              onClick={() => setShowBlocks(false)}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto noir-scrollbar flex-1 pr-2">
            {!blocks || blocks.length === 0 ? (
              <div className="text-gray-500 text-sm text-center mt-10">
                No content found.
              </div>
            ) : (
              <div className="text-gray-300 text-sm leading-relaxed space-y-1">
                {blocks.map((block: any) => {
                  const renderedText = extractBlockText(block);
                  return renderedText ? (
                    <div key={block.id}>{renderedText}</div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
