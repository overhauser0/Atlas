'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { Person, PersonPiece, PersonTimelinePiece } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { sortByStartDate } from '@/utils/piece';
import type { LinkedTimelinePiece, PieceDraft } from './types';

type ConfirmFn = (
  title: string,
  message: ReactNode,
  confirmText?: string,
  cancelText?: string,
) => Promise<boolean>;

const fetchTimelinePieces = async (personId: string) => {
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

const sortTimelineDesc = (pieces: LinkedTimelinePiece[]) =>
  [...pieces].sort((a, b) => {
    if (!a.start_date) return b.start_date ? 1 : 0;
    if (!b.start_date) return -1;
    return b.start_date.localeCompare(a.start_date);
  });

export function usePersonTimeline(
  person: Person | null,
  isEditing: boolean,
  onSaved: (person?: Person) => void,
  confirm: ConfirmFn,
) {
  const [timelinePieces, setTimelinePieces] = useState<LinkedTimelinePiece[]>(
    [],
  );
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineActionError, setTimelineActionError] = useState<string | null>(
    null,
  );
  const [isUpdatingTimelinePiece, setIsUpdatingTimelinePiece] = useState(false);
  const [openPieceMenuId, setOpenPieceMenuId] = useState<string | null>(null);

  // Edit timeline piece modal state
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

  // Add / link piece modal state
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
    void fetchTimelinePieces(person.id)
      .then((pieces) => {
        if (isCurrent) {
          setTimelinePieces(sortByStartDate(pieces, 'desc'));
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

  const closePieceModal = () => {
    setPieceModalType(null);
    setPieceActionError(null);
  };

  const appendTimelinePiece = (piece: LinkedTimelinePiece) => {
    setTimelinePieces((current) =>
      sortTimelineDesc([
        ...current.filter(
          (item) => !(item.id === piece.id && item.source === piece.source),
        ),
        piece,
      ]),
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

  const updateTimelinePiece = async (
    piece: LinkedTimelinePiece,
    action: 'delete' | 'unlink',
  ) => {
    if (!person || isUpdatingTimelinePiece) return;

    setOpenPieceMenuId(null);
    setTimelineActionError(null);
    const confirmed = await confirm(
      action === 'delete' ? 'Piece削除の確認' : '紐づけ解除の確認',
      action === 'delete'
        ? `Piece「${piece.title}」を削除しますか？この操作は取り消せません。`
        : `Piece「${piece.title}」の紐づけを解除します。Piece自体は削除されません。`,
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

  const closeTimelinePieceEditor = () => {
    setEditingTimelinePiece(null);
    setTimelineEditError(null);
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

      const updatedPiece: LinkedTimelinePiece = {
        ...editingTimelinePiece,
        title: timelineEditDraft.title.trim(),
        start_date: timelineEditDraft.date || null,
        note: timelineEditDraft.note.trim(),
      };
      setTimelinePieces((current) =>
        sortTimelineDesc(
          current.map((piece) =>
            piece.id === editingTimelinePiece.id &&
            piece.source === editingTimelinePiece.source
              ? updatedPiece
              : piece,
          ),
        ),
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

  const linkedPieceKeys = new Set(
    timelinePieces.map((piece) => `${piece.source}:${piece.id}`),
  );
  const filteredAvailablePieces = availablePieces.filter((piece) => {
    if (linkedPieceKeys.has(`${piece.source}:${piece.id}`)) return false;
    return piece.title
      .toLocaleLowerCase()
      .includes(pieceSearchQuery.trim().toLocaleLowerCase());
  });

  return {
    timelinePieces,
    isTimelineLoading,
    timelineError,
    timelineActionError,
    isUpdatingTimelinePiece,
    openPieceMenuId,
    setOpenPieceMenuId,
    editingTimelinePiece,
    timelineEditDraft,
    setTimelineEditDraft,
    timelineEditError,
    isSavingTimelineEdit,
    openTimelinePieceEditor,
    closeTimelinePieceEditor,
    saveTimelinePieceEdit,
    updateTimelinePiece,
    pieceModalType,
    pieceDraft,
    setPieceDraft,
    pieceSearchQuery,
    setPieceSearchQuery,
    filteredAvailablePieces,
    isLoadingAvailablePieces,
    availablePiecesError,
    pieceActionError,
    isSavingPiece,
    openPieceModal,
    closePieceModal,
    linkPieceToPerson,
    createAndLinkPiece,
  };
}
