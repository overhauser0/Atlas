'use client';

import { X } from 'lucide-react';
import type { ExternalLinkType } from './types';

interface PersonExternalLinkModalProps {
  linkModalType: ExternalLinkType;
  linkIdDraft: string;
  isSavingLink: boolean;
  isSearchingImmichPerson: boolean;
  immichPersonSearchNotFound: boolean;
  linkModalError: string | null;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function PersonExternalLinkModal({
  linkModalType,
  linkIdDraft,
  isSavingLink,
  isSearchingImmichPerson,
  immichPersonSearchNotFound,
  linkModalError,
  onChangeDraft,
  onSave,
  onClose,
}: PersonExternalLinkModalProps) {
  const linkLabel =
    linkModalType === 'immich_person_id' ? 'Immich' : 'Google Contacts';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSavingLink) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-link-dialog-title"
        className="trails-modal-panel w-full max-w-md p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="person-link-dialog-title"
            className="text-lg font-bold text-gray-900"
          >
            {linkLabel}連携
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingLink}
            aria-label="閉じる"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-600">
            {linkModalType === 'immich_person_id'
              ? 'Immich Person ID'
              : 'Google Contact ID'}
          </span>
          <input
            autoFocus
            value={linkIdDraft}
            onChange={(event) => onChangeDraft(event.target.value)}
            disabled={isSearchingImmichPerson}
            className="trails-input"
            placeholder="IDを入力"
          />
        </label>

        {isSearchingImmichPerson && linkModalType === 'immich_person_id' && (
          <p className="mt-2 text-xs text-gray-500">
            Immichで同じ名前の人物を検索中...
          </p>
        )}
        {immichPersonSearchNotFound && linkModalType === 'immich_person_id' && (
          <p className="mt-2 text-xs text-gray-500">
            同じ名前の人物は見つかりませんでした。IDを直接入力できます。
          </p>
        )}

        {linkModalError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {linkModalError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingLink || isSearchingImmichPerson}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingLink || isSearchingImmichPerson}
            className="trails-btn-primary px-5"
          >
            {isSavingLink
              ? '保存中...'
              : isSearchingImmichPerson
                ? '検索中...'
                : '保存'}
          </button>
        </div>
      </section>
    </div>
  );
}
