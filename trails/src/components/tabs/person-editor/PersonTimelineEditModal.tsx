'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { getNotionLinkById } from '@/utils/piece';
import type { LinkedTimelinePiece, PieceDraft } from './types';

interface PersonTimelineEditModalProps {
  piece: LinkedTimelinePiece;
  draft: PieceDraft;
  setDraft: Dispatch<SetStateAction<PieceDraft>>;
  error: string | null;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export default function PersonTimelineEditModal({
  piece,
  draft,
  setDraft,
  error,
  isSaving,
  onSave,
  onClose,
}: PersonTimelineEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-timeline-edit-title"
        className="trails-modal-panel w-full max-w-lg p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="person-timeline-edit-title"
            className="text-lg font-bold text-gray-900"
          >
            タイムラインを編集
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="閉じる"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">日付</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              disabled={isSaving}
              className="trails-input"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">
              タイトル <span className="text-red-500">*</span>
            </span>
            <input
              autoFocus
              maxLength={255}
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              disabled={isSaving}
              className="trails-input"
              placeholder="タイトル"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">Note</span>
            <textarea
              rows={4}
              value={draft.note}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              disabled={isSaving}
              className="trails-input resize-y"
              placeholder="Note（任意）"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {piece.source === 'NOTION' && (
            <button
              type="button"
              onClick={() =>
                window.open(getNotionLinkById(piece.id, 'notion'), '_self')
              }
              className="mr-auto inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              <ExternalLink className="h-4 w-4" />
              Notionで開く
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !draft.title.trim()}
            className="trails-btn-primary px-5"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </section>
    </div>
  );
}
