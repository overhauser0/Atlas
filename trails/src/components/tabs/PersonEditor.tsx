'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  ContactRound,
  Image,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlink,
  UsersRound,
  X,
} from 'lucide-react';
import { Person, PersonPiece, PersonTimelinePiece } from '@/types';
import { atlasFetch } from '@/utils/api';
import { getDateFullString } from '@/utils/dateUtils';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import PersonPhotoModal from '@/components/modal/PersonPhotoModal';

interface PersonEditorProps {
  person: Person | null;
  onClose: () => void;
  onSaved: (person?: Person) => void;
}

interface PersonForm {
  family_name: string;
  given_name: string;
  ruby_family_name: string;
  ruby_given_name: string;
  birthday: string;
  tags: string;
  bloodType: string;
  notes: string;
}

interface PieceDraft {
  date: string;
  title: string;
  note: string;
}

interface LinkedTimelinePiece extends PersonTimelinePiece {
  personPieceId: string;
}

const EMPTY_FORM: PersonForm = {
  family_name: '',
  given_name: '',
  ruby_family_name: '',
  ruby_given_name: '',
  birthday: '',
  tags: '',
  bloodType: '',
  notes: '',
};

const toForm = (person: Person | null): PersonForm =>
  person
    ? {
        family_name: person.family_name,
        given_name: person.given_name ?? '',
        ruby_family_name: person.ruby_family_name ?? '',
        ruby_given_name: person.ruby_given_name ?? '',
        birthday: person.birthday?.slice(0, 10) ?? '',
        tags: person.tags?.join(', ') ?? '',
        bloodType: person.blood_type?.join(', ') ?? '',
        notes: person.notes ?? '',
      }
    : EMPTY_FORM;

const getTimelinePieces = async (personId: string) => {
  const linksResponse = await atlasFetch(`/people/${personId}/pieces`);
  if (!linksResponse.ok) {
    throw new Error(`関連Pieceの取得に失敗しました (${linksResponse.status})`);
  }

  const linksData: { person_pieces: PersonPiece[] } =
    await linksResponse.json();
  if (!Array.isArray(linksData.person_pieces)) {
    throw new Error('関連Pieceのレスポンス形式が正しくありません');
  }

  return Promise.all(
    linksData.person_pieces.map(async (link) => {
      const pieceId = link.notion_piece_id ?? link.local_piece_id;
      if (!pieceId) {
        throw new Error('関連PieceのIDがありません');
      }

      const pieceResponse = await atlasFetch(
        `/pieces/${encodeURIComponent(pieceId)}`,
      );
      if (!pieceResponse.ok) {
        throw new Error(
          `関連Piece (${pieceId}) の取得に失敗しました (${pieceResponse.status})`,
        );
      }

      const pieceData: { piece: PersonTimelinePiece } =
        await pieceResponse.json();
      if (!pieceData.piece || typeof pieceData.piece.title !== 'string') {
        throw new Error('Pieceのレスポンス形式が正しくありません');
      }
      return { ...pieceData.piece, personPieceId: link.id };
    }),
  );
};

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
  const [timelinePieces, setTimelinePieces] = useState<LinkedTimelinePiece[]>(
    [],
  );
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineActionError, setTimelineActionError] = useState<string | null>(
    null,
  );
  const [isUpdatingTimelinePiece, setIsUpdatingTimelinePiece] = useState(false);
  const [editingTimelinePiece, setEditingTimelinePiece] =
    useState<LinkedTimelinePiece | null>(null);
  const [timelineEditDraft, setTimelineEditDraft] = useState<PieceDraft>({
    date: '',
    title: '',
    note: '',
  });
  const [timelineEditError, setTimelineEditError] = useState<string | null>(
    null,
  );
  const [isSavingTimelineEdit, setIsSavingTimelineEdit] = useState(false);
  const [openPieceMenuId, setOpenPieceMenuId] = useState<string | null>(null);
  const pieceMenuRef = useRef<HTMLDivElement>(null);
  const { confirm, confirmProps } = useConfirm();
  const [pieceModalType, setPieceModalType] = useState<
    'create' | 'link' | null
  >(null);
  const [pieceDraft, setPieceDraft] = useState<PieceDraft>({
    date: '',
    title: '',
    note: '',
  });
  const [pieceSearchQuery, setPieceSearchQuery] = useState('');
  const [availablePieces, setAvailablePieces] = useState<PersonTimelinePiece[]>(
    [],
  );
  const [isLoadingAvailablePieces, setIsLoadingAvailablePieces] =
    useState(false);
  const [availablePiecesError, setAvailablePiecesError] = useState<
    string | null
  >(null);
  const [pieceActionError, setPieceActionError] = useState<string | null>(null);
  const [isSavingPiece, setIsSavingPiece] = useState(false);
  const [linkModalType, setLinkModalType] = useState<
    'immich_person_id' | 'google_contact_id' | null
  >(null);
  const [linkIdDraft, setLinkIdDraft] = useState('');
  const [linkModalError, setLinkModalError] = useState<string | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isSearchingImmichPerson, setIsSearchingImmichPerson] = useState(false);
  const [isPersonPhotoModalOpen, setIsPersonPhotoModalOpen] = useState(false);
  const [immichPersonSearchNotFound, setImmichPersonSearchNotFound] =
    useState(false);
  const immichSearchRequestId = useRef(0);
  const [linkedIds, setLinkedIds] = useState({
    immich_person_id: person?.immich_person_id ?? null,
    google_contact_id: person?.google_contact_id ?? null,
  });

  useEffect(() => {
    setForm(toForm(person));
    setIsEditing(person === null);
    setError(null);
    setLinkedIds({
      immich_person_id: person?.immich_person_id ?? null,
      google_contact_id: person?.google_contact_id ?? null,
    });
  }, [person]);

  useEffect(() => {
    if (!person || isEditing) {
      setTimelinePieces([]);
      setTimelineError(null);
      setTimelineActionError(null);
      setOpenPieceMenuId(null);
      setIsTimelineLoading(false);
      return;
    }

    let isCurrent = true;
    setIsTimelineLoading(true);
    setTimelineError(null);
    setTimelineActionError(null);
    setOpenPieceMenuId(null);
    void getTimelinePieces(person.id)
      .then((pieces) => {
        if (isCurrent) {
          setTimelinePieces(
            pieces.sort((a, b) => {
              if (!a.start_date) return b.start_date ? 1 : 0;
              if (!b.start_date) return -1;
              return b.start_date.localeCompare(a.start_date);
            }),
          );
        }
      })
      .catch((fetchError: unknown) => {
        console.error('Failed to fetch person timeline:', fetchError);
        if (isCurrent) {
          setTimelineError(
            fetchError instanceof Error
              ? fetchError.message
              : '関連Pieceの取得に失敗しました',
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsTimelineLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [person, isEditing]);

  useEffect(() => {
    if (!person || pieceModalType !== 'link') return;

    let isCurrent = true;
    setIsLoadingAvailablePieces(true);
    setAvailablePiecesError(null);
    void atlasFetch('/pieces')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Pieceの検索に失敗しました (${response.status})`);
        }
        const data: { pieces: PersonTimelinePiece[] } = await response.json();
        if (!Array.isArray(data.pieces)) {
          throw new Error('Pieceの検索結果の形式が正しくありません');
        }
        if (isCurrent) setAvailablePieces(data.pieces);
      })
      .catch((fetchError: unknown) => {
        console.error('Failed to fetch pieces for person linking:', fetchError);
        if (isCurrent) {
          setAvailablePiecesError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Pieceの検索に失敗しました',
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAvailablePieces(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [person, pieceModalType]);

  useEffect(() => {
    if (isSaving) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openPieceMenuId) {
        setOpenPieceMenuId(null);
        return;
      }
      if (editingTimelinePiece && !isSavingTimelineEdit) {
        setEditingTimelinePiece(null);
        setTimelineEditError(null);
        return;
      }
      if (pieceModalType && !isSavingPiece) {
        setPieceModalType(null);
        setPieceActionError(null);
        return;
      }
      if (linkModalType) {
        immichSearchRequestId.current += 1;
        setIsSearchingImmichPerson(false);
        setLinkModalType(null);
        setLinkModalError(null);
        return;
      }
      if (isEditing && person) {
        setForm(toForm(person));
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
    editingTimelinePiece,
    isSavingTimelineEdit,
    linkModalType,
    pieceModalType,
    isSavingPiece,
    openPieceMenuId,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pieceMenuRef.current &&
        !pieceMenuRef.current.contains(event.target as Node)
      ) {
        setOpenPieceMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const updateField = (field: keyof PersonForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const persistLinkId = async (
    type: 'immich_person_id' | 'google_contact_id',
    draft: string,
  ) => {
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
      immichSearchRequestId.current += 1;
      setIsSearchingImmichPerson(false);
      setLinkModalType(null);
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

  const openLinkModal = (type: 'immich_person_id' | 'google_contact_id') => {
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

  const saveLinkId = async () => {
    if (!person || !linkModalType || isSavingLink) return;

    await persistLinkId(linkModalType, linkIdDraft);
  };

  const openPieceModal = (type: 'create' | 'link') => {
    setPieceDraft({
      date: new Date().toLocaleDateString('sv-SE'),
      title: '',
      note: '',
    });
    setPieceSearchQuery('');
    setPieceActionError(null);
    setAvailablePiecesError(null);
    setPieceModalType(type);
  };

  const appendTimelinePiece = (piece: LinkedTimelinePiece) => {
    setTimelinePieces((current) =>
      [
        ...current.filter(
          (item) => !(item.id === piece.id && item.source === piece.source),
        ),
        piece,
      ].sort((a, b) => {
        if (!a.start_date) return b.start_date ? 1 : 0;
        if (!b.start_date) return -1;
        return b.start_date.localeCompare(a.start_date);
      }),
    );
  };

  const linkPieceToPerson = async (piece: PersonTimelinePiece) => {
    if (!person || isSavingPiece) return;

    setIsSavingPiece(true);
    setPieceActionError(null);
    try {
      const linkResponse = await atlasFetch(`/people/${person.id}/pieces`, {
        method: 'POST',
        body: JSON.stringify(
          piece.source === 'NOTION'
            ? { notion_piece_id: piece.id }
            : { local_piece_id: piece.id },
        ),
      });
      if (!linkResponse.ok) {
        const result: { message?: string } = await linkResponse
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message ||
            `Pieceの紐づけに失敗しました (${linkResponse.status})`,
        );
      }

      const result: { person_piece?: PersonPiece } = await linkResponse.json();
      if (!result.person_piece?.id) {
        throw new Error('Pieceの紐づけレスポンス形式が正しくありません');
      }

      appendTimelinePiece({ ...piece, personPieceId: result.person_piece.id });
      setPieceModalType(null);
      onSaved();
    } catch (saveError) {
      console.error('Failed to link piece to person:', saveError);
      setPieceActionError(
        saveError instanceof Error
          ? saveError.message
          : 'Pieceの紐づけに失敗しました',
      );
    } finally {
      setIsSavingPiece(false);
    }
  };

  const updateTimelinePiece = async (
    piece: LinkedTimelinePiece,
    action: 'delete' | 'unlink',
  ) => {
    if (!person || isUpdatingTimelinePiece) return;

    setOpenPieceMenuId(null);
    setTimelineActionError(null);
    const confirmed = await confirm(
      action === 'delete' ? 'Piece削除の確認' : '紐づけ解除の確認',
      action === 'delete' ? (
        <>Piece「{piece.title}」を削除しますか？この操作は取り消せません。</>
      ) : (
        <>
          Piece「{piece.title}
          」の紐づけを解除します。Piece自体は削除されません。
        </>
      ),
      action === 'delete' ? '削除する' : '解除する',
      'キャンセル',
    );
    if (!confirmed) return;

    setIsUpdatingTimelinePiece(true);
    try {
      const response =
        action === 'delete'
          ? await atlasFetch(`/pieces/${encodeURIComponent(piece.id)}`, {
              method: 'DELETE',
            })
          : await atlasFetch(
              `/people/${person.id}/pieces/${encodeURIComponent(piece.personPieceId)}`,
              { method: 'DELETE' },
            );
      if (!response.ok) {
        const result: { message?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message ||
            `Pieceの${action === 'delete' ? '削除' : '紐づけ解除'}に失敗しました (${response.status})`,
        );
      }

      setTimelinePieces((current) =>
        current.filter(
          (item) => !(item.id === piece.id && item.source === piece.source),
        ),
      );
      onSaved();
    } catch (actionError) {
      console.error(
        `Failed to ${action === 'delete' ? 'delete' : 'unlink'} person timeline piece:`,
        actionError,
      );
      setTimelineActionError(
        actionError instanceof Error
          ? actionError.message
          : `Pieceの${action === 'delete' ? '削除' : '紐づけ解除'}に失敗しました`,
      );
    } finally {
      setIsUpdatingTimelinePiece(false);
    }
  };

  const openTimelinePieceEditor = (piece: LinkedTimelinePiece) => {
    setOpenPieceMenuId(null);
    setTimelineEditDraft({
      date: piece.start_date?.slice(0, 10) ?? '',
      title: piece.title,
      note: piece.note ?? '',
    });
    setTimelineEditError(null);
    setEditingTimelinePiece(piece);
  };

  const saveTimelinePieceEdit = async () => {
    if (
      !editingTimelinePiece ||
      isSavingTimelineEdit ||
      !timelineEditDraft.title.trim()
    ) {
      return;
    }

    setIsSavingTimelineEdit(true);
    setTimelineEditError(null);
    try {
      const response = await atlasFetch(
        `/pieces/${encodeURIComponent(editingTimelinePiece.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: timelineEditDraft.title.trim(),
            start_date: timelineEditDraft.date || null,
            ...(!timelineEditDraft.date
              ? {
                  start_time: null,
                  end_date: null,
                  end_time: null,
                }
              : {}),
            note: timelineEditDraft.note.trim(),
          }),
        },
      );
      if (!response.ok) {
        const result: { message?: string } = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message || `Pieceの更新に失敗しました (${response.status})`,
        );
      }

      const updatedPiece = {
        ...editingTimelinePiece,
        title: timelineEditDraft.title.trim(),
        start_date: timelineEditDraft.date || null,
        ...(!timelineEditDraft.date
          ? {
              start_time: null,
              end_date: null,
              end_time: null,
            }
          : {}),
        note: timelineEditDraft.note.trim(),
      };
      setTimelinePieces((current) =>
        current
          .map((piece) =>
            piece.id === editingTimelinePiece.id &&
            piece.source === editingTimelinePiece.source
              ? updatedPiece
              : piece,
          )
          .sort((a, b) => {
            if (!a.start_date) return b.start_date ? 1 : 0;
            if (!b.start_date) return -1;
            return b.start_date.localeCompare(a.start_date);
          }),
      );
      setEditingTimelinePiece(null);
      onSaved();
    } catch (saveError) {
      console.error('Failed to update person timeline piece:', saveError);
      setTimelineEditError(
        saveError instanceof Error
          ? saveError.message
          : 'Pieceの更新に失敗しました',
      );
    } finally {
      setIsSavingTimelineEdit(false);
    }
  };

  const createAndLinkPiece = async () => {
    if (!person || isSavingPiece || !pieceDraft.title.trim()) return;

    setIsSavingPiece(true);
    setPieceActionError(null);
    try {
      const createResponse = await atlasFetch('/pieces', {
        method: 'POST',
        body: JSON.stringify({
          start_date: pieceDraft.date || null,
          title: pieceDraft.title.trim(),
          note: pieceDraft.note.trim(),
          area: 'Life',
          type: 'Memo',
          status: 'Done',
          source: 'LOCAL',
        }),
      });
      if (!createResponse.ok) {
        const result: { message?: string } = await createResponse
          .json()
          .catch(() => ({}));
        throw new Error(
          result.message ||
            `Pieceの作成に失敗しました (${createResponse.status})`,
        );
      }

      const result: { piece?: PersonTimelinePiece } =
        await createResponse.json();
      if (!result.piece?.id) {
        throw new Error('作成したPieceのレスポンス形式が正しくありません');
      }

      await linkPieceToPerson({
        ...result.piece,
        title: result.piece.title || pieceDraft.title.trim(),
        start_date: result.piece.start_date ?? pieceDraft.date,
        note: result.piece.note ?? pieceDraft.note.trim(),
        source: 'LOCAL',
      });
    } catch (saveError) {
      console.error('Failed to create person-related piece:', saveError);
      setPieceActionError(
        saveError instanceof Error
          ? saveError.message
          : 'Pieceの作成に失敗しました',
      );
      setIsSavingPiece(false);
    }
  };

  const linkedPieceKeys = new Set(
    timelinePieces.map((piece) => `${piece.source}:${piece.id}`),
  );
  const filteredAvailablePieces = availablePieces.filter((piece) => {
    if (linkedPieceKeys.has(`${piece.source}:${piece.id}`)) return false;
    return piece.title
      .toLocaleLowerCase()
      .includes(pieceSearchQuery.trim().toLocaleLowerCase());
  });

  const inputClassName =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-amber-400 focus:bg-white';
  const isReadOnly = person !== null && !isEditing;
  const linkLabel =
    linkModalType === 'immich_person_id' ? 'Immich' : 'Google Contacts';

  return (
    <div
      className={
        isReadOnly
          ? 'flex h-full flex-col overflow-hidden'
          : 'h-full overflow-y-auto'
      }
    >
      <div
        className={`p-4 md:p-8 ${
          isReadOnly ? 'flex min-h-0 flex-1 flex-col' : ''
        }`}
      >
        <div className="mb-6 flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="人物一覧に戻る"
            className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-white disabled:opacity-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {!isReadOnly && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {person
                  ? isEditing
                    ? '人物を編集'
                    : '人物の詳細'
                  : '人物を追加'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {person
                  ? isEditing
                    ? '人物情報を編集します'
                    : '登録されている人物情報'
                  : '人物情報を登録します'}
              </p>
            </div>
          )}
        </div>

        <div
          className={
            isReadOnly
              ? 'flex min-h-0 flex-1 flex-col'
              : 'overflow-hidden rounded-2xl border border-gray-200 bg-white'
          }
        >
          {isReadOnly && person && (
            <>
              <header className="flex shrink-0 items-center gap-4 py-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <UsersRound className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  {(person.ruby_family_name || person.ruby_given_name) && (
                    <p className="mb-0.5 text-xs text-gray-500">
                      {[person.ruby_family_name, person.ruby_given_name]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {[person.family_name, person.given_name]
                      .filter(Boolean)
                      .join(' ')}
                  </h2>
                  {person.tags && person.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {person.tags.map((tag) => (
                        <span key={tag} className="trails-badge">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openLinkModal('immich_person_id')}
                    aria-label={`Immich${linkedIds.immich_person_id ? '連携済み' : '未連携'}。連携IDを編集`}
                    title={`Immich${linkedIds.immich_person_id ? '連携済み' : '未連携'}`}
                    className={`rounded-full p-2.5 transition-colors hover:bg-gray-100 ${
                      linkedIds.immich_person_id
                        ? 'text-amber-600'
                        : 'text-gray-300'
                    }`}
                  >
                    <Image className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openLinkModal('google_contact_id')}
                    aria-label={`Google Contacts${linkedIds.google_contact_id ? '連携済み' : '未連携'}。連携IDを編集`}
                    title={`Google Contacts${linkedIds.google_contact_id ? '連携済み' : '未連携'}`}
                    className={`rounded-full p-2.5 transition-colors hover:bg-gray-100 ${
                      linkedIds.google_contact_id
                        ? 'text-blue-600'
                        : 'text-gray-300'
                    }`}
                  >
                    <ContactRound className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    aria-label="人物を編集"
                    className="ml-1 rounded-full p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 items-start gap-4 overflow-y-auto trails-scrollbar md:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
                <div className="space-y-4">
                  <section
                    className="rounded-2xl bg-white p-5"
                    aria-label="基本情報"
                  >
                    <h3 className="mb-4 text-sm font-bold text-gray-900">
                      基本情報
                    </h3>
                    <dl className="space-y-4">
                      <div>
                        <dt className="text-xs font-semibold text-gray-500">
                          誕生日
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {person.birthday
                            ? getDateFullString(person.birthday, 'hyphen')
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-gray-500">
                          血液型
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {person.blood_type?.join(', ') || '—'}
                        </dd>
                      </div>
                      {person.notes && (
                        <div>
                          <dt className="text-xs font-semibold text-gray-500">
                            メモ
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                            {person.notes}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </section>

                  {linkedIds.immich_person_id && (
                    <section
                      className="rounded-2xl bg-white p-5"
                      aria-labelledby="person-immich-heading"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-amber-600" />
                        <h3
                          id="person-immich-heading"
                          className="text-sm font-bold text-gray-900"
                        >
                          Immich
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPersonPhotoModalOpen(true)}
                        className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
                      >
                        写真を開く
                      </button>
                    </section>
                  )}
                </div>

                <section
                  className="rounded-2xl bg-white p-5"
                  aria-labelledby="person-timeline-heading"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-amber-600" />
                      <h3
                        id="person-timeline-heading"
                        className="text-sm font-bold text-gray-900"
                      >
                        タイムライン
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPieceModal('create')}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
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
                      {timelinePieces.map((piece, index) => (
                        <li
                          key={`${piece.source}-${piece.id}`}
                          className="relative pl-7"
                        >
                          {index < timelinePieces.length - 1 && (
                            <span
                              aria-hidden="true"
                              className="absolute bottom-0 left-[7px] top-4 w-px bg-amber-200"
                            />
                          )}
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1 h-4 w-4 rounded-full border-[3px] border-amber-400 bg-white"
                          />
                          <article className="flex items-start justify-between gap-2 border-b border-gray-100 pb-4 pl-1 pt-0.5 last:border-0">
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 text-xs font-semibold text-amber-700">
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
                              ref={
                                openPieceMenuId ===
                                `${piece.source}:${piece.id}`
                                  ? pieceMenuRef
                                  : null
                              }
                            >
                              <button
                                type="button"
                                aria-label={`${piece.title}の操作`}
                                aria-haspopup="menu"
                                aria-expanded={
                                  openPieceMenuId ===
                                  `${piece.source}:${piece.id}`
                                }
                                disabled={isUpdatingTimelinePiece}
                                onClick={() =>
                                  setOpenPieceMenuId((current) =>
                                    current === `${piece.source}:${piece.id}`
                                      ? null
                                      : `${piece.source}:${piece.id}`,
                                  )
                                }
                                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openPieceMenuId ===
                                `${piece.source}:${piece.id}` && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={isUpdatingTimelinePiece}
                                    onClick={() =>
                                      openTimelinePieceEditor(piece)
                                    }
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
                                      void updateTimelinePiece(piece, 'delete')
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
                                      void updateTimelinePiece(piece, 'unlink')
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
                      ))}
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
          )}

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
                  updateField('family_name', event.target.value)
                }
                className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
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
                  updateField('given_name', event.target.value)
                }
                className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
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
                    updateField('ruby_family_name', event.target.value)
                  }
                  className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
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
                    updateField('ruby_given_name', event.target.value)
                  }
                  className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
                  placeholder="めい"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  誕生日
                </span>
                <input
                  type="date"
                  value={form.birthday}
                  readOnly={isReadOnly}
                  onChange={(event) =>
                    updateField('birthday', event.target.value)
                  }
                  className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  血液型
                </span>
                <input
                  value={form.bloodType}
                  readOnly={isReadOnly}
                  onChange={(event) =>
                    updateField('bloodType', event.target.value)
                  }
                  className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
                  placeholder="例: A, Rh+"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">タグ</span>
              <input
                value={form.tags}
                readOnly={isReadOnly}
                onChange={(event) => updateField('tags', event.target.value)}
                className={`${inputClassName} read-only:border-transparent read-only:bg-white read-only:px-0`}
                placeholder="カンマ区切りで入力"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">メモ</span>
              <textarea
                rows={4}
                value={form.notes}
                readOnly={isReadOnly}
                onChange={(event) => updateField('notes', event.target.value)}
                className={`${inputClassName} resize-y read-only:border-transparent read-only:bg-white read-only:px-0`}
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
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
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
                    onClick={() => void handleDeletePerson()}
                    disabled={isSaving || isDeletingPerson}
                    className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeletingPerson ? '削除中...' : '人物を削除'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (person) {
                      setForm(toForm(person));
                      setIsEditing(false);
                      setError(null);
                    } else {
                      onClose();
                    }
                  }}
                  disabled={isSaving || isDeletingPerson}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  {person ? '編集をキャンセル' : 'キャンセル'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={
                    isSaving ||
                    isDeletingPerson ||
                    form.family_name.trim().length === 0
                  }
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving ? '保存中...' : person ? '保存' : '登録'}
                </button>
              </>
            )}
          </div>
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

      {person && editingTimelinePiece && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingTimelineEdit) {
              setEditingTimelinePiece(null);
              setTimelineEditError(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-timeline-edit-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
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
                onClick={() => {
                  setEditingTimelinePiece(null);
                  setTimelineEditError(null);
                }}
                disabled={isSavingTimelineEdit}
                aria-label="閉じる"
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  日付
                </span>
                <input
                  type="date"
                  value={timelineEditDraft.date}
                  onChange={(event) =>
                    setTimelineEditDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  disabled={isSavingTimelineEdit}
                  className={inputClassName}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  タイトル <span className="text-red-500">*</span>
                </span>
                <input
                  autoFocus
                  maxLength={255}
                  value={timelineEditDraft.title}
                  onChange={(event) =>
                    setTimelineEditDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  disabled={isSavingTimelineEdit}
                  className={inputClassName}
                  placeholder="タイトル"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  Note
                </span>
                <textarea
                  rows={4}
                  value={timelineEditDraft.note}
                  onChange={(event) =>
                    setTimelineEditDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  disabled={isSavingTimelineEdit}
                  className={`${inputClassName} resize-y`}
                  placeholder="Note（任意）"
                />
              </label>
            </div>

            {timelineEditError && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {timelineEditError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTimelinePiece(null);
                  setTimelineEditError(null);
                }}
                disabled={isSavingTimelineEdit}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void saveTimelinePieceEdit()}
                disabled={
                  isSavingTimelineEdit || !timelineEditDraft.title.trim()
                }
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSavingTimelineEdit ? '保存中...' : '保存'}
              </button>
            </div>
          </section>
        </div>
      )}

      {person && linkModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingLink) {
              immichSearchRequestId.current += 1;
              setIsSearchingImmichPerson(false);
              setLinkModalType(null);
              setLinkModalError(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-link-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
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
                onClick={() => {
                  immichSearchRequestId.current += 1;
                  setIsSearchingImmichPerson(false);
                  setLinkModalType(null);
                  setLinkModalError(null);
                }}
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
                onChange={(event) => setLinkIdDraft(event.target.value)}
                disabled={isSearchingImmichPerson}
                className={inputClassName}
                placeholder="IDを入力"
              />
            </label>

            {isSearchingImmichPerson &&
              linkModalType === 'immich_person_id' && (
                <p className="mt-2 text-xs text-gray-500">
                  Immichで同じ名前の人物を検索中...
                </p>
              )}
            {immichPersonSearchNotFound &&
              linkModalType === 'immich_person_id' && (
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
                onClick={() => {
                  immichSearchRequestId.current += 1;
                  setIsSearchingImmichPerson(false);
                  setLinkModalType(null);
                  setLinkModalError(null);
                }}
                disabled={isSavingLink || isSearchingImmichPerson}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void saveLinkId()}
                disabled={isSavingLink || isSearchingImmichPerson}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
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
      )}

      {person && pieceModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingPiece) {
              setPieceModalType(null);
              setPieceActionError(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-piece-dialog-title"
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl"
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
                onClick={() => {
                  setPieceModalType(null);
                  setPieceActionError(null);
                }}
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
                onClick={() => openPieceModal('create')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  pieceModalType === 'create'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                新規作成
              </button>
              <button
                type="button"
                onClick={() => openPieceModal('link')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  pieceModalType === 'link'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                既存Pieceを紐づけ
              </button>
            </div>

            {pieceModalType === 'create' ? (
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">
                    日付
                  </span>
                  <input
                    type="date"
                    value={pieceDraft.date}
                    onChange={(event) =>
                      setPieceDraft((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className={inputClassName}
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
                    className={inputClassName}
                    placeholder="タイトル"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">
                    Note
                  </span>
                  <textarea
                    rows={4}
                    value={pieceDraft.note}
                    onChange={(event) =>
                      setPieceDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    className={`${inputClassName} resize-y`}
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
                    onChange={(event) =>
                      setPieceSearchQuery(event.target.value)
                    }
                    className={`${inputClassName} pl-9`}
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
                            onClick={() => void linkPieceToPerson(piece)}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-amber-50 disabled:opacity-50"
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

            {pieceModalType === 'create' && (
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPieceModalType(null);
                    setPieceActionError(null);
                  }}
                  disabled={isSavingPiece}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => void createAndLinkPiece()}
                  disabled={isSavingPiece || !pieceDraft.title.trim()}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSavingPiece ? '作成中...' : '作成して紐づけ'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
