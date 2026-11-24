'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { Person } from '@/types';
import type { PersonForm } from './types';

interface PersonFormFieldsProps {
  person: Person | null;
  form: PersonForm;
  isReadOnly: boolean;
  isSaving: boolean;
  isDeletingPerson: boolean;
  error: string | null;
  onUpdateField: (field: keyof PersonForm, value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onClose: () => void;
}

const INPUT_CLASS =
  'trails-input read-only:border-transparent read-only:bg-white read-only:px-0';

export default function PersonFormFields({
  person,
  form,
  isReadOnly,
  isSaving,
  isDeletingPerson,
  error,
  onUpdateField,
  onSave,
  onDelete,
  onCancelEdit,
  onStartEdit,
  onClose,
}: PersonFormFieldsProps) {
  return (
    <>
      <div
        className={isReadOnly ? 'hidden' : 'space-y-5 p-5 md:p-8'}
        aria-hidden={isReadOnly}
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-600">
            姓 <span className="text-red-500">*</span>
          </span>
          <input
            autoFocus={!isReadOnly}
            required
            maxLength={255}
            value={form.family_name}
            readOnly={isReadOnly}
            onChange={(event) =>
              onUpdateField('family_name', event.target.value)
            }
            className={INPUT_CLASS}
            placeholder="姓"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-600">名</span>
          <input
            maxLength={255}
            value={form.given_name}
            readOnly={isReadOnly}
            onChange={(event) =>
              onUpdateField('given_name', event.target.value)
            }
            className={INPUT_CLASS}
            placeholder="名（任意）"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">
              姓の読み仮名
            </span>
            <input
              maxLength={255}
              value={form.ruby_family_name}
              readOnly={isReadOnly}
              onChange={(event) =>
                onUpdateField('ruby_family_name', event.target.value)
              }
              className={INPUT_CLASS}
              placeholder="せい"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">
              名の読み仮名
            </span>
            <input
              maxLength={255}
              value={form.ruby_given_name}
              readOnly={isReadOnly}
              onChange={(event) =>
                onUpdateField('ruby_given_name', event.target.value)
              }
              className={INPUT_CLASS}
              placeholder="めい"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">誕生日</span>
            <input
              type="date"
              value={form.birthday}
              readOnly={isReadOnly}
              onChange={(event) =>
                onUpdateField('birthday', event.target.value)
              }
              className={INPUT_CLASS}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-gray-600">血液型</span>
            <input
              value={form.bloodType}
              readOnly={isReadOnly}
              onChange={(event) =>
                onUpdateField('bloodType', event.target.value)
              }
              className={INPUT_CLASS}
              placeholder="例: A, Rh+"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-600">タグ</span>
          <input
            value={form.tags}
            readOnly={isReadOnly}
            onChange={(event) => onUpdateField('tags', event.target.value)}
            className={INPUT_CLASS}
            placeholder="カンマ区切りで入力"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-600">メモ</span>
          <textarea
            rows={4}
            value={form.notes}
            readOnly={isReadOnly}
            onChange={(event) => onUpdateField('notes', event.target.value)}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="メモ"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div
        className={`flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 p-4 ${
          isReadOnly ? 'hidden' : ''
        }`}
      >
        {isReadOnly ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              className="trails-btn-primary px-5"
            >
              <Pencil className="h-4 w-4" />
              編集
            </button>
          </>
        ) : (
          <>
            {person && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving || isDeletingPerson}
                className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingPerson ? '削除中...' : '人物を削除'}
              </button>
            )}
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSaving || isDeletingPerson}
              className="trails-btn-ghost"
            >
              {person ? '編集をキャンセル' : 'キャンセル'}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={
                isSaving ||
                isDeletingPerson ||
                form.family_name.trim().length === 0
              }
              className="trails-btn-primary px-5"
            >
              {isSaving ? '保存中...' : person ? '保存' : '登録'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
