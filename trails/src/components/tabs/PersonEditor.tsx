'use client';

import { useEffect, useRef, useState } from 'react';
import { ContactRound, Image, Pencil, UsersRound } from 'lucide-react';
import type { Person } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { formatPersonName, formatPersonRuby } from '@/utils/person';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import PersonPhotoModal from '@/components/modal/PersonPhotoModal';
import PageHeader from '@/components/ui/PageHeader';
import {
  EMPTY_FORM,
  toPersonForm,
  type ExternalLinkType,
  type PersonForm,
} from './person-editor/types';
import { usePersonTimeline } from './person-editor/usePersonTimeline';
import PersonProfileView from './person-editor/PersonProfileView';
import PersonFormFields from './person-editor/PersonFormFields';
import PersonExternalLinkModal from './person-editor/PersonExternalLinkModal';
import PersonPieceModal from './person-editor/PersonPieceModal';
import PersonTimelineEditModal from './person-editor/PersonTimelineEditModal';

interface PersonEditorProps {
  person: Person | null;
  onClose: () => void;
  onSaved: (person?: Person) => void;
}

export default function PersonEditor({
  person,
  onClose,
  onSaved,
}: PersonEditorProps) {
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkModalType, setLinkModalType] = useState<ExternalLinkType | null>(
    null,
  );
  const [linkIdDraft, setLinkIdDraft] = useState('');
  const [linkModalError, setLinkModalError] = useState<string | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isSearchingImmichPerson, setIsSearchingImmichPerson] = useState(false);
  const [isPersonPhotoModalOpen, setIsPersonPhotoModalOpen] = useState(false);
  const [immichPersonSearchNotFound, setImmichPersonSearchNotFound] =
    useState(false);
  const [linkedIds, setLinkedIds] = useState({
    immich_person_id: person?.immich_person_id ?? null,
    google_contact_id: person?.google_contact_id ?? null,
  });

  const immichSearchRequestId = useRef(0);
  const pieceMenuRef = useRef<HTMLDivElement>(null);
  const { confirm, confirmProps } = useConfirm();

  const timeline = usePersonTimeline(person, isEditing, onSaved, confirm);

  useEffect(() => {
    setForm(toPersonForm(person));
    setIsEditing(person === null);
    setError(null);
    setLinkedIds({
      immich_person_id: person?.immich_person_id ?? null,
      google_contact_id: person?.google_contact_id ?? null,
    });
  }, [person]);

  const closeLinkModal = () => {
    immichSearchRequestId.current += 1;
    setIsSearchingImmichPerson(false);
    setLinkModalType(null);
    setLinkModalError(null);
  };

  useEffect(() => {
    if (isSaving) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (timeline.openPieceMenuId) {
        timeline.setOpenPieceMenuId(null);
        return;
      }
      if (timeline.editingTimelinePiece && !timeline.isSavingTimelineEdit) {
        timeline.closeTimelinePieceEditor();
        return;
      }
      if (timeline.pieceModalType && !timeline.isSavingPiece) {
        timeline.closePieceModal();
        return;
      }
      if (linkModalType) {
        closeLinkModal();
        return;
      }
      if (isEditing && person) {
        setForm(toPersonForm(person));
        setIsEditing(false);
        setError(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSaving,
    isEditing,
    person,
    onClose,
    linkModalType,
    timeline,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pieceMenuRef.current &&
        !pieceMenuRef.current.contains(event.target as Node)
      ) {
        timeline.setOpenPieceMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [timeline]);

  const isReadOnly = person !== null && !isEditing;

  const handleSave = async () => {
    if (isSaving || isReadOnly) return;
    setError(null);
    setIsSaving(true);

    const payload = {
      family_name: form.family_name.trim(),
      given_name: form.given_name.trim() || null,
      ruby_family_name: form.ruby_family_name.trim() || null,
      ruby_given_name: form.ruby_given_name.trim() || null,
      birthday: form.birthday || null,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      blood_type: form.bloodType
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean),
      notes: form.notes.trim() || null,
    };

    try {
      const response = await atlasFetch(
        person ? `/people/${person.id}` : '/people',
        {
          method: person ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const result: { message?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message ||
            `人物の${person ? '更新' : '登録'}に失敗しました (${response.status})`,
        );
      }

      const result: { person?: Person } = await response.json();
      if (!result.person || (person && result.person.id !== person.id)) {
        throw new Error('保存した人物のレスポンス形式が正しくありません');
      }

      onSaved(result.person);
      if (person) {
        setIsEditing(false);
      } else {
        onClose();
      }
    } catch (saveError) {
      console.error(
        `Failed to ${person ? 'update' : 'create'} person:`,
        saveError,
      );
      setError(
        saveError instanceof Error
          ? saveError.message
          : `人物の${person ? '更新' : '登録'}に失敗しました`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!person || isSaving || isDeletingPerson) return;

    const confirmed = await confirm(
      '人物削除の確認',
      <>
        「{[person.family_name, person.given_name].filter(Boolean).join(' ')}
        」を削除しますか？この操作は取り消せません。
      </>,
      '削除する',
      'キャンセル',
    );
    if (!confirmed) return;

    setError(null);
    setIsDeletingPerson(true);
    try {
      const response = await atlasFetch(`/people/${person.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const result: { message?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message || `人物の削除に失敗しました (${response.status})`,
        );
      }

      onSaved();
      onClose();
    } catch (deleteError) {
      console.error('Failed to delete person:', deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : '人物の削除に失敗しました',
      );
    } finally {
      setIsDeletingPerson(false);
    }
  };

  const persistLinkId = async (type: ExternalLinkType, draft: string) => {
    if (!person || isSavingLink) return;

    setIsSavingLink(true);
    setLinkModalError(null);
    const value = draft.trim() || null;
    try {
      const response = await atlasFetch(`/people/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [type]: value }),
      });
      if (!response.ok) {
        const result: { message?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message || `連携IDの更新に失敗しました (${response.status})`,
        );
      }

      setLinkedIds((current) => ({ ...current, [type]: value }));
      closeLinkModal();
      onSaved();
    } catch (saveError) {
      console.error('Failed to update external service link:', saveError);
      setLinkModalError(
        saveError instanceof Error
          ? saveError.message
          : '連携IDの更新に失敗しました',
      );
    } finally {
      setIsSavingLink(false);
    }
  };

  const findImmichPerson = async (requestId: number, name: string) => {
    setIsSearchingImmichPerson(true);
    setImmichPersonSearchNotFound(false);
    try {
      const response = await atlasFetch(
        `/immich/people/search?name=${encodeURIComponent(name)}`,
      );
      if (!response.ok) {
        const result: { message?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message ||
            `Immichの人物検索に失敗しました (${response.status})`,
        );
      }

      const result: {
        data?: Array<{
          immich_person_id: string;
          family_name: string;
          given_name: string | null;
        }>;
      } = await response.json();
      if (
        !Array.isArray(result.data) ||
        result.data.some(
          (match) =>
            typeof match.immich_person_id !== 'string' ||
            typeof match.family_name !== 'string' ||
            (match.given_name !== null && typeof match.given_name !== 'string'),
        )
      ) {
        throw new Error('Immichの人物検索結果の形式が正しくありません');
      }

      if (
        requestId !== immichSearchRequestId.current ||
        result.data.length === 0
      ) {
        if (
          requestId === immichSearchRequestId.current &&
          result.data.length === 0
        ) {
          setImmichPersonSearchNotFound(true);
        }
        return;
      }

      const match = result.data[0];
      const matchedName = [match.family_name, match.given_name]
        .filter(Boolean)
        .join(' ');
      const confirmed = await confirm(
        'Immich人物の確認',
        <>同じ名前の人物「{matchedName}」が見つかりました。連携しますか？</>,
        '連携する',
        'キャンセル',
      );
      if (confirmed && requestId === immichSearchRequestId.current) {
        setLinkIdDraft(match.immich_person_id);
        await persistLinkId('immich_person_id', match.immich_person_id);
      }
    } catch (searchError) {
      if (requestId !== immichSearchRequestId.current) return;
      console.error(
        'Failed to search Immich person by full name:',
        searchError,
      );
      setLinkModalError(
        searchError instanceof Error
          ? searchError.message
          : 'Immichの人物検索に失敗しました',
      );
    } finally {
      if (requestId === immichSearchRequestId.current) {
        setIsSearchingImmichPerson(false);
      }
    }
  };

  const openLinkModal = (type: ExternalLinkType) => {
    const requestId = ++immichSearchRequestId.current;
    setIsSearchingImmichPerson(false);
    setLinkIdDraft(linkedIds[type] ?? '');
    setLinkModalError(null);
    setImmichPersonSearchNotFound(false);
    setLinkModalType(type);

    if (type === 'immich_person_id' && !linkedIds.immich_person_id && person) {
      const fullName = [person.family_name, person.given_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fullName) void findImmichPerson(requestId, fullName);
    }
  };

  const fullName = person ? formatPersonName(person) : '';

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
      <PageHeader
        icon={<UsersRound />}
        title={
          person
            ? isEditing
              ? '人物を編集'
              : fullName || '人物の詳細'
            : '人物を追加'
        }
        subtitle={
          person
            ? isEditing
              ? '人物情報を編集します'
              : formatPersonRuby(person) || '人物の詳細'
            : '人物情報を登録します'
        }
        onBack={onClose}
        backLabel="人物一覧に戻る"
        backDisabled={isSaving}
        actions={
          isReadOnly && person ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => openLinkModal('immich_person_id')}
                aria-label={`Immich${linkedIds.immich_person_id ? '連携済み' : '未連携'}。連携IDを編集`}
                title={`Immich${linkedIds.immich_person_id ? '連携済み' : '未連携'}`}
                className={`trails-nav-icon-btn ${
                  linkedIds.immich_person_id
                    ? 'text-primary-600'
                    : 'text-gray-300'
                }`}
              >
                <Image className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openLinkModal('google_contact_id')}
                aria-label={`Google Contacts${linkedIds.google_contact_id ? '連携済み' : '未連携'}。連携IDを編集`}
                title={`Google Contacts${linkedIds.google_contact_id ? '連携済み' : '未連携'}`}
                className={`trails-nav-icon-btn ${
                  linkedIds.google_contact_id
                    ? 'text-blue-600'
                    : 'text-gray-300'
                }`}
              >
                <ContactRound className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="人物を編集"
                className="trails-nav-icon-btn"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-32 no-scrollbar">
        <div
          className={
            isReadOnly ? 'space-y-4' : 'trails-card overflow-hidden'
          }
        >
          {isReadOnly && person && (
            <PersonProfileView
              person={person}
              immichPersonId={linkedIds.immich_person_id}
              timelinePieces={timeline.timelinePieces}
              isTimelineLoading={timeline.isTimelineLoading}
              timelineError={timeline.timelineError}
              timelineActionError={timeline.timelineActionError}
              isUpdatingTimelinePiece={timeline.isUpdatingTimelinePiece}
              openPieceMenuId={timeline.openPieceMenuId}
              setOpenPieceMenuId={timeline.setOpenPieceMenuId}
              pieceMenuRef={pieceMenuRef}
              onOpenPhotos={() => setIsPersonPhotoModalOpen(true)}
              onOpenAddPiece={() => timeline.openPieceModal('create')}
              onEditTimelinePiece={timeline.openTimelinePieceEditor}
              onTimelinePieceAction={(piece, action) =>
                void timeline.updateTimelinePiece(piece, action)
              }
            />
          )}

          <PersonFormFields
            person={person}
            form={form}
            isReadOnly={isReadOnly}
            isSaving={isSaving}
            isDeletingPerson={isDeletingPerson}
            error={error}
            onUpdateField={(field, value) =>
              setForm((current) => ({ ...current, [field]: value }))
            }
            onSave={() => void handleSave()}
            onDelete={() => void handleDeletePerson()}
            onCancelEdit={() => {
              if (person) {
                setForm(toPersonForm(person));
                setIsEditing(false);
                setError(null);
              } else {
                onClose();
              }
            }}
            onStartEdit={() => setIsEditing(true)}
            onClose={onClose}
          />
        </div>
      </div>

      {person && (
        <PersonPhotoModal
          isOpen={isPersonPhotoModalOpen}
          personId={linkedIds.immich_person_id}
          personName={[person.family_name, person.given_name]
            .filter(Boolean)
            .join(' ')}
          onClose={() => setIsPersonPhotoModalOpen(false)}
        />
      )}

      {person && timeline.editingTimelinePiece && (
        <PersonTimelineEditModal
          piece={timeline.editingTimelinePiece}
          draft={timeline.timelineEditDraft}
          setDraft={timeline.setTimelineEditDraft}
          error={timeline.timelineEditError}
          isSaving={timeline.isSavingTimelineEdit}
          onSave={() => void timeline.saveTimelinePieceEdit()}
          onClose={timeline.closeTimelinePieceEditor}
        />
      )}

      {person && linkModalType && (
        <PersonExternalLinkModal
          linkModalType={linkModalType}
          linkIdDraft={linkIdDraft}
          isSavingLink={isSavingLink}
          isSearchingImmichPerson={isSearchingImmichPerson}
          immichPersonSearchNotFound={immichPersonSearchNotFound}
          linkModalError={linkModalError}
          onChangeDraft={setLinkIdDraft}
          onSave={() => void persistLinkId(linkModalType, linkIdDraft)}
          onClose={closeLinkModal}
        />
      )}

      {person && timeline.pieceModalType && (
        <PersonPieceModal
          mode={timeline.pieceModalType}
          pieceDraft={timeline.pieceDraft}
          setPieceDraft={timeline.setPieceDraft}
          pieceSearchQuery={timeline.pieceSearchQuery}
          setPieceSearchQuery={timeline.setPieceSearchQuery}
          filteredAvailablePieces={timeline.filteredAvailablePieces}
          isLoadingAvailablePieces={timeline.isLoadingAvailablePieces}
          availablePiecesError={timeline.availablePiecesError}
          pieceActionError={timeline.pieceActionError}
          isSavingPiece={timeline.isSavingPiece}
          onSwitchMode={timeline.openPieceModal}
          onCreateAndLink={() => void timeline.createAndLinkPiece()}
          onLinkExisting={(piece) => void timeline.linkPieceToPerson(piece)}
          onClose={timeline.closePieceModal}
        />
      )}

      <ConfirmModal {...confirmProps} />
    </div>
  );
}
