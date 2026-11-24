'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  Camera,
  CalendarDays,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  UsersRound,
} from 'lucide-react';
import type { Person } from '@/types';
import { getDateFullString } from '@atlas/shared/date';
import type { LinkedTimelinePiece } from './types';

interface PersonProfileViewProps {
  person: Person;
  immichPersonId: string | null;
  timelinePieces: LinkedTimelinePiece[];
  isTimelineLoading: boolean;
  timelineError: string | null;
  timelineActionError: string | null;
  isUpdatingTimelinePiece: boolean;
  openPieceMenuId: string | null;
  setOpenPieceMenuId: Dispatch<SetStateAction<string | null>>;
  pieceMenuRef: RefObject<HTMLDivElement>;
  onOpenPhotos: () => void;
  onOpenAddPiece: () => void;
  onEditTimelinePiece: (piece: LinkedTimelinePiece) => void;
  onTimelinePieceAction: (
    piece: LinkedTimelinePiece,
    action: 'delete' | 'unlink',
  ) => void;
}

export default function PersonProfileView({
  person,
  immichPersonId,
  timelinePieces,
  isTimelineLoading,
  timelineError,
  timelineActionError,
  isUpdatingTimelinePiece,
  openPieceMenuId,
  setOpenPieceMenuId,
  pieceMenuRef,
  onOpenPhotos,
  onOpenAddPiece,
  onEditTimelinePiece,
  onTimelinePieceAction,
}: PersonProfileViewProps) {
  return (
    <>
      {person.tags && person.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {person.tags.map((tag) => (
            <span
              key={tag}
              className="trails-badge border border-gray-200 bg-white"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
        <div className="space-y-4">
          <section className="trails-card p-5" aria-label="基本情報">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
                <UsersRound className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">基本情報</h3>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="trails-section-label">誕生日</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {person.birthday
                    ? getDateFullString(person.birthday, 'hyphen')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="trails-section-label">血液型</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {person.blood_type?.join(', ') || '—'}
                </dd>
              </div>
              {person.notes && (
                <div>
                  <dt className="trails-section-label">メモ</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {person.notes}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {immichPersonId && (
            <section
              className="trails-card p-5"
              aria-labelledby="person-immich-heading"
            >
              <div className="mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary-600" />
                <h3
                  id="person-immich-heading"
                  className="text-sm font-bold text-gray-900"
                >
                  Immich
                </h3>
              </div>
              <button
                type="button"
                onClick={onOpenPhotos}
                className="trails-btn-primary w-full"
              >
                写真を開く
              </button>
            </section>
          )}
        </div>

        <section
          className="trails-card p-5"
          aria-labelledby="person-timeline-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary-600" />
              <h3
                id="person-timeline-heading"
                className="text-sm font-bold text-gray-900"
              >
                タイムライン
              </h3>
            </div>
            <button
              type="button"
              onClick={onOpenAddPiece}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
            >
              <Plus className="h-4 w-4" />
              Pieceを追加
            </button>
          </div>

          {isTimelineLoading ? (
            <p className="py-6 text-center text-sm text-gray-500">
              タイムラインを読み込み中...
            </p>
          ) : timelineError ? (
            <p role="alert" className="py-4 text-sm text-red-600">
              {timelineError}
            </p>
          ) : timelinePieces.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-500">
                関連付けられたPieceはありません
              </p>
            </div>
          ) : (
            <ol className="space-y-0">
              {timelinePieces.map((piece, index) => {
                const menuKey = `${piece.source}:${piece.id}`;
                const isMenuOpen = openPieceMenuId === menuKey;

                return (
                  <li
                    key={`${piece.source}-${piece.id}`}
                    className="relative pl-7"
                  >
                    {index < timelinePieces.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[7px] top-4 w-px bg-primary-200"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1 h-4 w-4 rounded-full border-[3px] border-primary-400 bg-white"
                    />
                    <article className="flex items-start justify-between gap-2 border-b border-gray-100 pb-4 pl-1 pt-0.5 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs font-semibold text-primary-700">
                          {piece.start_date
                            ? getDateFullString(piece.start_date, 'hyphen')
                            : '日付未設定'}
                        </p>
                        <h4 className="font-bold text-gray-900">
                          {piece.title}
                        </h4>
                        {piece.note && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                            {piece.note}
                          </p>
                        )}
                      </div>
                      <div
                        className="relative -mt-1 shrink-0"
                        ref={isMenuOpen ? pieceMenuRef : null}
                      >
                        <button
                          type="button"
                          aria-label={`${piece.title}の操作`}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          disabled={isUpdatingTimelinePiece}
                          onClick={() =>
                            setOpenPieceMenuId((current) =>
                              current === menuKey ? null : menuKey,
                            )
                          }
                          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {isMenuOpen && (
                          <div
                            role="menu"
                            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-2xl border border-gray-100 bg-white py-1.5 shadow-xl"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isUpdatingTimelinePiece}
                              onClick={() => onEditTimelinePiece(piece)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4" />
                              編集
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isUpdatingTimelinePiece}
                              onClick={() =>
                                onTimelinePieceAction(piece, 'delete')
                              }
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Pieceを削除
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isUpdatingTimelinePiece}
                              onClick={() =>
                                onTimelinePieceAction(piece, 'unlink')
                              }
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Unlink className="h-4 w-4" />
                              紐づけを解除
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
          {timelineActionError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {timelineActionError}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
