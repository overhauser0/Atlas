'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Search, X } from 'lucide-react';
import type { PersonTimelinePiece } from '@/types';
import { getDateFullString } from '@atlas/shared/date';
import type { PieceDraft } from './types';

interface PersonPieceModalProps {
  mode: 'create' | 'link';
  pieceDraft: PieceDraft;
  setPieceDraft: Dispatch<SetStateAction<PieceDraft>>;
  pieceSearchQuery: string;
  setPieceSearchQuery: (value: string) => void;
  filteredAvailablePieces: PersonTimelinePiece[];
  isLoadingAvailablePieces: boolean;
  availablePiecesError: string | null;
  pieceActionError: string | null;
  isSavingPiece: boolean;
  onSwitchMode: (mode: 'create' | 'link') => void;
  onCreateAndLink: () => void;
  onLinkExisting: (piece: PersonTimelinePiece) => void;
  onClose: () => void;
}

export default function PersonPieceModal({
  mode,
  pieceDraft,
  setPieceDraft,
  pieceSearchQuery,
  setPieceSearchQuery,
  filteredAvailablePieces,
  isLoadingAvailablePieces,
  availablePiecesError,
  pieceActionError,
  isSavingPiece,
  onSwitchMode,
  onCreateAndLink,
  onLinkExisting,
  onClose,
}: PersonPieceModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSavingPiece) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-piece-dialog-title"
        className="trails-modal-panel flex max-h-[90vh] w-full max-w-lg flex-col p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="person-piece-dialog-title"
            className="text-lg font-bold text-gray-900"
          >
            関連Pieceを追加
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingPiece}
            aria-label="閉じる"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => onSwitchMode('create')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === 'create'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            新規作成
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('link')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === 'link'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            既存Pieceを紐づけ
          </button>
        </div>

        {mode === 'create' ? (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">日付</span>
              <input
                type="date"
                value={pieceDraft.date}
                onChange={(event) =>
                  setPieceDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
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
                value={pieceDraft.title}
                onChange={(event) =>
                  setPieceDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="trails-input"
                placeholder="タイトル"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">Note</span>
              <textarea
                rows={4}
                value={pieceDraft.note}
                onChange={(event) =>
                  setPieceDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                className="trails-input resize-y"
                placeholder="Note（任意）"
              />
            </label>
          </div>
        ) : (
          <>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={pieceSearchQuery}
                onChange={(event) => setPieceSearchQuery(event.target.value)}
                className="trails-input pl-9"
                placeholder="タイトルで検索"
              />
            </label>
            <div className="mt-3 h-48 shrink-0 overflow-y-auto rounded-xl border border-gray-100 trails-scrollbar">
              {isLoadingAvailablePieces ? (
                <p className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
                  Pieceを読み込み中...
                </p>
              ) : availablePiecesError ? (
                <p
                  role="alert"
                  className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600"
                >
                  {availablePiecesError}
                </p>
              ) : filteredAvailablePieces.length === 0 ? (
                <p className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
                  該当するPieceはありません
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredAvailablePieces.map((piece) => (
                    <li key={`${piece.source}:${piece.id}`}>
                      <button
                        type="button"
                        disabled={isSavingPiece}
                        onClick={() => onLinkExisting(piece)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-primary-50 disabled:opacity-50"
                      >
                        <span className="block truncate text-sm font-semibold text-gray-900">
                          {piece.title}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {piece.start_date
                            ? getDateFullString(piece.start_date, 'hyphen')
                            : '日付未設定'}
                          {' · '}
                          {piece.source === 'NOTION' ? 'Notion' : 'Local'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {pieceActionError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {pieceActionError}
          </p>
        )}

        {mode === 'create' && (
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSavingPiece}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onCreateAndLink}
              disabled={isSavingPiece || !pieceDraft.title.trim()}
              className="trails-btn-primary px-5"
            >
              {isSavingPiece ? '作成中...' : '作成して紐づけ'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
