'use client';

import type { RefObject } from 'react';
import {
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  FolderKanban,
  HardDrive,
  MonitorUp,
  MoreHorizontal,
  SquareArrowUp,
  Trash2,
  X,
} from 'lucide-react';
import type { Task } from '@/types';
import { getNotionLinkById } from '@/utils/task';

interface TaskModalHeaderProps {
  internalMode: 'create' | 'edit';
  source: string;
  task: Partial<Task> | null;
  isMoreMenuOpen: boolean;
  isLoadingBlocks: boolean;
  moreMenuRef: RefObject<HTMLDivElement>;
  onToggleMoreMenu: () => void;
  onCloseMoreMenu: () => void;
  onClose: () => void;
  onSendToPC?: (url: string) => void;
  onOpenFocusModal: (task: Partial<Task>) => void;
  onOpenParentSelector: () => void;
  onOpenPresetModal: () => void;
  onDelete: () => void;
  onShowContent: (id: string | undefined) => void;
  onPromote: () => void;
  onDuplicate: () => void;
}

export default function TaskModalHeader({
  internalMode,
  source,
  task,
  isMoreMenuOpen,
  isLoadingBlocks,
  moreMenuRef,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onClose,
  onSendToPC,
  onOpenFocusModal,
  onOpenParentSelector,
  onOpenPresetModal,
  onDelete,
  onShowContent,
  onPromote,
  onDuplicate,
}: TaskModalHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-3">
        <h2 className="text-lg font-bold text-white">
          {internalMode === 'create' ? 'New Task' : 'Edit Task'}
        </h2>
        {internalMode === 'edit' && source === 'LOCAL' && (
          <HardDrive className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {source === 'NOTION' && task?.id && (
        <a
          href={getNotionLinkById(task.id, 'notion')}
          target="_self"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="noir-icon-btn"
          title="Notionで開く (Ctrl+O)"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      )}

      {onSendToPC && source === 'NOTION' && task?.id && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (task.id) onSendToPC(getNotionLinkById(task.id, 'https'));
            onClose();
          }}
          className="noir-icon-btn"
          title="PC（ブラウザ）で開く (Ctrl+E)"
        >
          <MonitorUp className="w-5 h-5" />
        </button>
      )}

      {internalMode === 'edit' && task && (
        <button
          type="button"
          onClick={() => onOpenFocusModal(task)}
          className="noir-icon-btn hidden md:flex"
          title="Focus"
          aria-label="Focus"
        >
          <Flame className="w-5 h-5 text-amber-500" />
        </button>
      )}

      {internalMode === 'edit' && task?.id && (
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={onToggleMoreMenu}
            className={`noir-icon-btn ${isMoreMenuOpen ? 'bg-white/10 text-white' : ''}`}
            title="その他"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {isMoreMenuOpen && (
            <div className="noir-subglass absolute right-0 w-48 z-60 mt-2 py-1.5 rounded-xl">
              {task && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseMoreMenu();
                    onOpenFocusModal(task);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-amber-500 hover:bg-white/10 flex items-center gap-3 transition-colors md:hidden"
                >
                  <Flame className="w-4 h-4" />
                  Focus
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onCloseMoreMenu();
                  onOpenParentSelector();
                }}
                className="w-full text-left px-4 py-3 text-sm text-violet-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-violet-400" />
                プロジェクト設定
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseMoreMenu();
                  onOpenPresetModal();
                }}
                className="w-full text-left px-4 py-3 text-sm text-cyan-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                プリセットを追加
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseMoreMenu();
                  onDelete();
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
                title="削除 (Delete)"
              >
                <Trash2 className="w-4 h-4" />
                削除
              </button>
              {internalMode === 'edit' && task?.id && source === 'NOTION' && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseMoreMenu();
                    onShowContent(task.id);
                  }}
                  disabled={isLoadingBlocks}
                  className="w-full text-left px-4 py-3 text-sm text-orange-400 hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5"
                  title="ページ内容を表示"
                >
                  <FileText className="w-5 h-5" />
                  ページ内容を表示
                </button>
              )}
              {source === 'LOCAL' && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseMoreMenu();
                    onPromote();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-green-400 hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5"
                  title="Notionに昇格 (Ctrl+P)"
                >
                  <SquareArrowUp className="w-4 h-4" />
                  Notionに昇格
                </button>
              )}
              {internalMode === 'edit' && task?.id && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseMoreMenu();
                    onDuplicate();
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

      <button
        type="button"
        onClick={onClose}
        className="noir-icon-btn"
        title="閉じる (Esc)"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
