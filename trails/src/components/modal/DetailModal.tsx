'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save,
  Loader2,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Calendar,
  AlignLeft,
  ChevronDown,
  Tag,
  Link as LinkIcon,
  Search,
  UserRoundPlus,
  Maximize2,
  Minimize2,
  Info,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { LifeItem, Person } from '@/types';
import { atlasFetch } from '@atlas/shared/api';
import { fetchPieceBlocks, type NotionBlock } from '@atlas/shared/notion';
import { formatPersonName } from '@/utils/person';
import { getStatusColor, getNotionLinkById } from '@/utils/piece';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import DetailDateTimeSection from './detail-modal/DetailDateTimeSection';
import DetailTagsSection from './detail-modal/DetailTagsSection';
import DetailSparksSection from './detail-modal/DetailSparksSection';
import NotionBodyViewer from './detail-modal/NotionBodyViewer';
import {
  normalizeTimeForApi,
  normalizeTimeForInput,
} from './detail-modal/sparkUtils';

const STATUSES = ['INBOX', 'Waiting', 'Going', 'Done'];
type LinkedPerson = Pick<Person, 'id' | 'family_name' | 'given_name'>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: Partial<LifeItem> | null;
  initialValues?: Partial<LifeItem> | null;
}

export default function DetailModal({
  isOpen,
  onClose,
  item,
  initialValues,
}: Props) {
  const { addToast } = useToast();

  const [formData, setFormData] = useState<LifeItem>({
    id: '',
    title: '',
    status: 'INBOX',
    start_date: null,
    start_time: null,
    end_date: null,
    end_time: null,
    area: 'Life',
    type: null,
    topics: [],
    flags: [],
    fkw: [],
    note: '',
    url: '',
    prefs: [],
    imageUrl: '',
    iconType: 'leaf',
    source: '',
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [linkedPeople, setLinkedPeople] = useState<LinkedPerson[]>([]);
  const [availablePeople, setAvailablePeople] = useState<Person[]>([]);
  const [isPeoplePickerOpen, setIsPeoplePickerOpen] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isLinkingPerson, setIsLinkingPerson] = useState(false);
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [peopleError, setPeopleError] = useState('');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Notion Body Blocks state
  const [notionBlocks, setNotionBlocks] = useState<NotionBlock[] | null>(null);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState('');
  const loadedBlocksPieceIdRef = useRef<string | null>(null);

  // アニメーション制御用のState
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const values = item ?? initialValues;
      setFormData({
        id: values?.id || '',
        title: values?.title || '',
        status: values?.status || 'INBOX',
        start_date: values?.start_date?.slice(0, 10) ?? null,
        start_time: values?.start_time ?? null,
        end_date: values?.end_date?.slice(0, 10) ?? null,
        end_time: values?.end_time ?? null,
        area: 'Life',
        type: values?.type || 'Event',
        topics: values?.topics || [],
        flags: values?.flags || [],
        fkw: values?.fkw || [],
        note: values?.note || '',
        url: values?.url || '',
        prefs: values?.prefs || [],
        imageUrl: values?.imageUrl || '',
        iconType: 'leaf',
        source: values?.source || 'NOTION',
      });
      setIsUrlInputOpen(Boolean(values?.url));
      setIsFullscreen(false);
      setIsPeoplePickerOpen(false);
      setPersonSearchQuery('');
      setIsStatusMenuOpen(false);
      setIsMoreMenuOpen(false);
      setNotionBlocks(null);
      setBlocksError('');
      loadedBlocksPieceIdRef.current = null;
    }
  }, [isOpen, item, initialValues]);

  useEffect(() => {
    const pieceId = item?.id;
    const source = item?.source;
    if (!isOpen || !pieceId || (source !== 'NOTION' && source !== 'LOCAL')) {
      setLinkedPeople([]);
      return;
    }

    let cancelled = false;
    const loadLinkedPeople = async () => {
      try {
        const response = await atlasFetch(
          `/pieces/${encodeURIComponent(pieceId)}/people?source=${source}`,
        );
        if (!response.ok) {
          throw new Error(
            `関連する人物の取得に失敗しました (${response.status})`,
          );
        }
        const result: { people: LinkedPerson[] } = await response.json();
        if (!Array.isArray(result.people)) {
          throw new Error('関連する人物のレスポンス形式が正しくありません');
        }
        if (!cancelled) setLinkedPeople(result.people);
      } catch (error) {
        console.error('Failed to load linked people:', error);
        if (!cancelled) {
          setPeopleError(
            error instanceof Error
              ? error.message
              : '関連する人物の取得に失敗しました',
          );
        }
      }
    };

    setLinkedPeople([]);
    setPeopleError('');
    void loadLinkedPeople();

    return () => {
      cancelled = true;
    };
  }, [isOpen, item?.id, item?.source]);

  const isExistingNotionPiece = Boolean(
    item?.id && formData.id && formData.source === 'NOTION',
  );

  const loadNotionBlocks = useCallback(
    async (pieceId: string, signal?: AbortSignal) => {
      setIsLoadingBlocks(true);
      setBlocksError('');
      try {
        const blocks = await fetchPieceBlocks(pieceId, { depth: 2, signal });
        if (signal?.aborted) return;
        setNotionBlocks(blocks);
        loadedBlocksPieceIdRef.current = pieceId;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Failed to load Notion blocks:', error);
        setBlocksError('Notion 本文の取得に失敗しました');
      } finally {
        if (!signal?.aborted) {
          setIsLoadingBlocks(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || !isFullscreen || !isExistingNotionPiece) return;
    if (loadedBlocksPieceIdRef.current === formData.id) return;

    const controller = new AbortController();
    void loadNotionBlocks(formData.id, controller.signal);
    return () => controller.abort();
  }, [
    isOpen,
    isFullscreen,
    isExistingNotionPiece,
    formData.id,
    loadNotionBlocks,
  ]);

  const handleBlocksAppended = useCallback((newBlocks: NotionBlock[]) => {
    if (newBlocks.length === 0) return;
    setNotionBlocks((prev) => [...(prev ?? []), ...newBlocks]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true); // まずDOMを描画
      // 描画直後にアニメーションを発火させるため、わずかな遅延を入れる
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false); // アニメーション（閉じる）を開始
      // アニメーション完了（300ms）を待ってからDOMを消す
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setIsStatusMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startDateKey = formData.start_date?.slice(0, 10) || null;
  const endDateKey = formData.end_date?.slice(0, 10) || null;
  const startTimeInput = normalizeTimeForInput(formData.start_time);
  const endTimeInput = normalizeTimeForInput(formData.end_time);

  const hasInvalidSchedule = Boolean(
    (startDateKey && endDateKey && endDateKey < startDateKey) ||
      (startDateKey &&
        (!endDateKey || endDateKey === startDateKey) &&
        startTimeInput &&
        endTimeInput &&
        endTimeInput < startTimeInput),
  );

  const isPiece = formData.source === 'NOTION' || formData.source === 'LOCAL';
  const isSaveBtnNeeds = !item || (isPiece && Boolean(formData.id));

  const handleSave = useCallback(async () => {
    if (isSaving || isDeleting || hasInvalidSchedule || !isSaveBtnNeeds) return;
    setIsSaving(true);
    const isEditing = item !== null;
    const url = isEditing ? `/pieces/${formData.id}` : '/pieces';
    const method = isEditing ? 'PATCH' : 'POST';

    const normalizedStartDate = formData.start_date?.slice(0, 10) || null;
    const normalizedStartTime = normalizedStartDate
      ? normalizeTimeForApi(formData.start_time)
      : null;
    const normalizedEndTime = normalizedStartDate
      ? normalizeTimeForApi(formData.end_time)
      : null;
    const normalizedEndDate = normalizedStartDate
      ? formData.end_date?.slice(0, 10) ||
        (normalizedEndTime ? normalizedStartDate : null)
      : null;

    const payload = {
      title: formData.title || 'No Title',
      status: formData.status || 'INBOX',
      start_date: normalizedStartDate,
      start_time: normalizedStartTime,
      end_date: normalizedEndDate,
      end_time: normalizedEndTime,
      area: formData.area,
      type: formData.type || 'Note',
      topics: formData.topics || [],
      flags: formData.flags || [],
      fkw: formData.fkw || [],
      prefs: formData.prefs || [],
      note: formData.note || '',
      url: formData.url || null,
      source: formData.source,
    };

    try {
      const res = await atlasFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(errorBody?.message || `Save failed (${res.status})`);
      }

      onClose();
    } catch (e) {
      console.error('Update failed', e);
      addToast('アイテムの保存に失敗しました', 'alert');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    isDeleting,
    hasInvalidSchedule,
    isSaveBtnNeeds,
    item,
    formData,
    onClose,
    addToast,
  ]);

  const handleDelete = async () => {
    if (!item?.id || isDeleting) return;
    if (!window.confirm('このアイテムを削除しますか？')) return;

    setIsDeleting(true);
    try {
      const response = await atlasFetch(`/pieces/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(
          `Failed to delete item: ${response.status} ${response.statusText}`,
        );
      }
      onClose();
    } catch (error) {
      console.error('Delete failed', error);
      window.alert('アイテムの削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPeoplePicker = async () => {
    setIsPeoplePickerOpen(true);
    setPeopleError('');
    if (availablePeople.length > 0) return;

    setIsLoadingPeople(true);
    try {
      const response = await atlasFetch('/people');
      if (!response.ok) {
        throw new Error(`人物一覧の取得に失敗しました (${response.status})`);
      }
      const result: { people: Person[] } = await response.json();
      if (!Array.isArray(result.people)) {
        throw new Error('人物一覧のレスポンス形式が正しくありません');
      }
      setAvailablePeople(result.people);
    } catch (error) {
      console.error('Failed to load people:', error);
      setPeopleError(
        error instanceof Error ? error.message : '人物一覧の取得に失敗しました',
      );
    } finally {
      setIsLoadingPeople(false);
    }
  };

  const handleLinkPerson = async (person: Person) => {
    if (!item?.id || isLinkingPerson) return;
    setIsLinkingPerson(true);
    setPeopleError('');
    try {
      const source = item.source === 'LOCAL' ? 'LOCAL' : 'NOTION';
      const response = await atlasFetch(
        `/people/${encodeURIComponent(person.id)}/pieces`,
        {
          method: 'POST',
          body: JSON.stringify(
            source === 'NOTION'
              ? { notion_piece_id: item.id }
              : { local_piece_id: item.id },
          ),
        },
      );
      if (!response.ok) {
        throw new Error(`人物の追加に失敗しました (${response.status})`);
      }

      setLinkedPeople((current) =>
        current.some(({ id }) => id === person.id)
          ? current
          : [...current, person],
      );
      setPersonSearchQuery('');
      setIsPeoplePickerOpen(false);
    } catch (error) {
      console.error('Failed to link person to piece:', error);
      setPeopleError(
        error instanceof Error ? error.message : '人物の追加に失敗しました',
      );
    } finally {
      setIsLinkingPerson(false);
    }
  };

  const normalizedPersonSearchQuery = personSearchQuery
    .trim()
    .toLocaleLowerCase();
  const matchingPeople = normalizedPersonSearchQuery
    ? availablePeople
        .filter((person) => {
          if (
            linkedPeople.some((linkedPerson) => linkedPerson.id === person.id)
          ) {
            return false;
          }
          const name = [
            person.family_name,
            person.given_name,
            person.ruby_family_name,
            person.ruby_given_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
          return name.includes(normalizedPersonSearchQuery);
        })
        .slice(0, 10)
    : [];

  // ショートカットキー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        // ドロップダウン、ステータスメニュー優先
        if (isMoreMenuOpen || isStatusMenuOpen || isPeoplePickerOpen) {
          setIsMoreMenuOpen(false);
          setIsStatusMenuOpen(false);
          setIsPeoplePickerOpen(false);
          return;
        }
        onClose();
        return;
      }

      if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    onClose,
    handleSave,
    isMoreMenuOpen,
    isStatusMenuOpen,
    isPeoplePickerOpen,
  ]);

  if (!isRendered || !formData) return null;

  const renderMoreMenu = (buttonClassName: string) =>
    item?.id && isPiece ? (
      <div className="relative shrink-0" ref={moreMenuRef}>
        <button
          type="button"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={isMoreMenuOpen}
          onClick={() => setIsMoreMenuOpen((open) => !open)}
          className={buttonClassName}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {isMoreMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-30 w-40 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              disabled={isDeleting}
              onClick={() => {
                setIsMoreMenuOpen(false);
                void handleDelete();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              削除
            </button>
          </div>
        )}
      </div>
    ) : null;

  const renderStatusSelect = () =>
    isPiece ? (
      <div className="relative flex-1 min-w-0" ref={statusMenuRef}>
        <button
          type="button"
          aria-label="State"
          aria-expanded={isStatusMenuOpen}
          onClick={() => setIsStatusMenuOpen((open) => !open)}
          className={`w-full p-3 rounded-xl border bg-gray-50 text-gray-700 flex items-center justify-between transition-colors focus:outline-none ${
            isStatusMenuOpen
              ? 'border-gray-400'
              : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusColor(formData.status)}`}
            />
            <span className="text-sm font-medium truncate">
              {formData.status}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isStatusMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isStatusMenuOpen && (
          <div
            role="listbox"
            aria-label="State"
            className="absolute left-0 right-0 z-20 mt-2 p-1.5 rounded-xl border border-gray-100 bg-white shadow-xl flex flex-col gap-1"
          >
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={formData.status === status}
                onClick={() => {
                  setFormData({ ...formData, status });
                  setIsStatusMenuOpen(false);
                }}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  formData.status === status
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`}
                />
                <span className="text-sm font-medium">{status}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    ) : null;

  const renderSourceToggle = () =>
    !item ? (
      <div className="flex items-center gap-3">
        <div
          role="group"
          aria-label="Source"
          className="relative flex w-full rounded-xl bg-gray-100 p-1"
        >
          <div
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-200 ${
              formData.source === 'NOTION' ? 'translate-x-full' : ''
            }`}
          />
          {(['LOCAL', 'NOTION'] as const).map((source) => (
            <button
              key={source}
              type="button"
              aria-pressed={formData.source === source}
              onClick={() => setFormData({ ...formData, source })}
              className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                formData.source === source
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const renderUrlField = () =>
    formData.url || isUrlInputOpen ? (
      <div className="flex w-full gap-2">
        <div className="relative flex-1 min-w-0">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="url"
            value={formData.url || ''}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            onBlur={() => {
              if (!formData.url) setIsUrlInputOpen(false);
            }}
            placeholder="https://..."
            className="w-full bg-gray-50 py-3 pl-11 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100"
          />
        </div>
        {formData.url && (
          <button
            type="button"
            onClick={() =>
              window.open(formData.url, '_blank', 'noopener,noreferrer')
            }
            className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-xl transition-colors"
            title="Open URL"
            aria-label="Open URL"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setIsUrlInputOpen(true)}
        className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Add URL"
      >
        <LinkIcon className="w-3.5 h-3.5" />
        URL
        <span className="text-gray-400">+</span>
      </button>
    );

  const renderPeopleSection = () =>
    item?.id && (item.source === 'NOTION' || item.source === 'LOCAL') ? (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {linkedPeople.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {linkedPeople.map((person) => (
                <span
                  key={person.id}
                  className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600"
                >
                  {formatPersonName(person)}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (isPeoplePickerOpen) {
                setIsPeoplePickerOpen(false);
              } else {
                void handleOpenPeoplePicker();
              }
            }}
            className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Add person"
            aria-expanded={isPeoplePickerOpen}
          >
            <UserRoundPlus className="w-3.5 h-3.5" />
            人物
            <span className="text-gray-400">+</span>
          </button>
        </div>
        {isPeoplePickerOpen && (
          <div className="w-full space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                aria-label="Search people"
                value={personSearchQuery}
                onChange={(event) => setPersonSearchQuery(event.target.value)}
                placeholder={isLoadingPeople ? '読み込み中...' : '名前で検索'}
                disabled={isLoadingPeople || isLinkingPerson}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:outline-none"
              />
            </div>
            <div className="h-24 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1">
              {!normalizedPersonSearchQuery ? (
                <p className="flex h-full items-center justify-center text-sm text-gray-400">
                  名前を入力して検索
                </p>
              ) : (
                <>
                  {matchingPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      disabled={isLinkingPerson}
                      onClick={() => void handleLinkPerson(person)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span>{formatPersonName(person)}</span>
                      {isLinkingPerson ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-xs text-gray-400">追加</span>
                      )}
                    </button>
                  ))}
                  {!isLoadingPeople && matchingPeople.length === 0 && (
                    <p className="flex h-full items-center justify-center text-sm text-gray-500">
                      該当する人物がいません
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {peopleError && (
          <p role="alert" className="text-xs text-red-600">
            {peopleError}
          </p>
        )}
      </div>
    ) : null;

  // ============================================================================
  // Fullscreen View
  // ============================================================================
  if (isFullscreen) {
    const fullscreenIcon =
      formData.type === 'Task' ? (
        <CheckSquare />
      ) : formData.type === 'Note' ? (
        <FileText />
      ) : (
        <Calendar />
      );

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className={`fixed inset-0 z-[60] bg-gray-100 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden px-5 pt-5 md:px-8 md:pt-8 md:pb-6">
          <PageHeader
            icon={fullscreenIcon}
            title={formData.title || (item ? '詳細編集' : '新規作成')}
            titleId="detail-modal-title"
            subtitle={
              formData.source === 'NOTION'
                ? 'Notion Piece'
                : formData.source === 'LOCAL'
                  ? 'Local Piece'
                  : undefined
            }
            onBack={onClose}
            backLabel="閉じる"
            className="mb-4 md:mb-5"
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  aria-label="コンパクト表示に戻す"
                  title="コンパクト表示に戻す"
                  className="trails-nav-icon-btn"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>

                {isExistingNotionPiece && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        getNotionLinkById(formData.id, 'notion'),
                        '_self',
                      )
                    }
                    aria-label="Open in Notion"
                    title="Open in Notion"
                    className="trails-nav-icon-btn hover:text-primary-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}

                {renderMoreMenu('trails-nav-icon-btn')}

                {isSaveBtnNeeds && (
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || isDeleting || hasInvalidSchedule}
                    className="trails-btn-primary px-3.5 py-2 text-xs md:text-sm"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline">Save</span>
                      </>
                    )}
                  </button>
                )}
              </>
            }
          />

          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
            <div className="grid w-full flex-1 grid-cols-1 gap-4 pb-10 md:h-full md:grid-cols-12 md:gap-5 md:overflow-hidden md:pb-0">
            {/* 左ペイン：基本情報・日時・タグ・URL・人物 */}
            <div className="md:col-span-5 lg:col-span-4 space-y-4 md:overflow-y-auto no-scrollbar md:pr-1">
              {formData.imageUrl && (
                <div className="h-44 overflow-hidden rounded-3xl border border-gray-100 bg-gray-200 shadow-sm">
                  <img
                    src={formData.imageUrl}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* 基本情報 Card */}
              <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3.5">
                <span className="trails-section-label block">Basic Info</span>

                <input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Title"
                  className="w-full font-bold text-xl text-gray-900 placeholder-gray-400 focus:outline-none border-b border-gray-100 pb-2"
                />

                {renderSourceToggle()}

                {isPiece && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {renderStatusSelect()}
                    <div className="relative flex-1 min-w-0">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        aria-label="Type"
                        value={formData.type || 'Event'}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                        className="w-full bg-gray-50 py-3 pl-9 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 appearance-none"
                      >
                        <option value="Task">Task</option>
                        <option value="Event">Event</option>
                        <option value="Note">Note</option>
                      </select>
                    </div>
                  </div>
                )}
              </section>

              {/* 日時 Card */}
              <DetailDateTimeSection
                startDate={formData.start_date}
                startTime={formData.start_time ?? null}
                endDate={formData.end_date ?? null}
                endTime={formData.end_time ?? null}
                onChange={(updates) =>
                  setFormData((prev) => ({ ...prev, ...updates }))
                }
              />

              {/* タグ・分類 Card */}
              {isPiece && (
                <DetailTagsSection
                  topics={formData.topics || []}
                  flags={formData.flags || []}
                  fkw={formData.fkw || []}
                  prefs={formData.prefs || []}
                  onChange={(updates) =>
                    setFormData((prev) => ({ ...prev, ...updates }))
                  }
                />
              )}

              {/* URL & People Card */}
              <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3.5">
                <span className="trails-section-label block">
                  Links &amp; People
                </span>
                <div className="flex flex-col gap-3">
                  {renderUrlField()}
                  {renderPeopleSection()}
                </div>
              </section>
            </div>

            {/* 右ペイン：Note・未消化 Spark・Notion 本文 */}
            <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-4 md:overflow-y-auto trails-scrollbar md:pr-1">
              {/* Note Card */}
              <section
                className={`bg-white rounded-3xl border border-gray-100 p-5 md:p-6 shadow-sm flex flex-col gap-3 ${
                  isExistingNotionPiece ? '' : 'flex-1'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <AlignLeft className="w-3.5 h-3.5 text-primary-500" />
                  <label
                    htmlFor="detail-note-textarea"
                    className="trails-section-label"
                  >
                    Note
                  </label>
                </div>
                <textarea
                  id="detail-note-textarea"
                  value={formData.note || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Add a note..."
                  className={`w-full rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5 text-sm md:text-base leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:bg-white focus:outline-none trails-scrollbar ${
                    isExistingNotionPiece
                      ? 'min-h-[160px] resize-y'
                      : 'flex-1 min-h-[300px] resize-y md:resize-none'
                  }`}
                />
              </section>

              {/* Notion由来かつ保存済み：未消化 Spark ＋ Notion 本文 */}
              {isExistingNotionPiece && (
                <>
                  <DetailSparksSection
                    pieceId={formData.id}
                    startDate={formData.start_date}
                    endDate={formData.end_date ?? null}
                    onBlocksAppended={handleBlocksAppended}
                  />
                  <NotionBodyViewer
                    blocks={notionBlocks}
                    isLoading={isLoadingBlocks}
                    error={blocksError}
                    onRefresh={() => void loadNotionBlocks(formData.id)}
                    onFetchChildren={(blockId) =>
                      fetchPieceBlocks(blockId, { depth: 1 })
                    }
                  />
                </>
              )}

              {/* 新規作成かつ Notion 選択時の案内 */}
              {!item && formData.source === 'NOTION' && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3 text-xs text-gray-500">
                  <Info className="w-4 h-4 shrink-0 text-primary-500" />
                  <span>
                    保存後に Notion 本文の閲覧と未消化 Spark の追記が利用できるようになります。
                  </span>
                </div>
              )}
            </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Compact Modal View (Default)
  // ============================================================================
  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ease-in-out ${
        isVisible
          ? 'bg-black/40 backdrop-blur-sm opacity-100'
          : 'bg-black/0 opacity-0'
      }`}
    >
      {/* onClick={onClose} バックドロップのクローズは一時停止 */}
      <div
        className={`relative bg-white w-full max-w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isVisible
            ? 'translate-y-0 sm:scale-100 sm:opacity-100'
            : 'translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()} // 中身のクリックでは閉じないようにする
      >
        <div className="overflow-y-auto flex-1 p-6 no-scrollbar flex flex-col gap-4">
          {/* 画像 */}
          {formData.imageUrl && (
            <div className="-mx-6 -mt-6 mb-6 h-56 relative bg-gray-100">
              <img
                src={formData.imageUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Action Buttons */}
          <div className="flex gap-2">
            <input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Title"
              className="w-full font-bold text-2xl text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              aria-label="フルスクリーンに拡大"
              title="フルスクリーンで編集"
              className="z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-white shadow-sm transition-all shrink-0"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {isExistingNotionPiece && (
              <button
                type="button"
                onClick={() =>
                  window.open(getNotionLinkById(formData.id, 'notion'), '_self')
                }
                className="z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-white shadow-sm transition-all shrink-0"
                title="Open in Notion"
                aria-label="Open in Notion"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            {renderMoreMenu(
              'z-10 w-10 h-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white shadow-sm transition-all',
            )}
          </div>

          {renderSourceToggle()}

          {/* Date & Status */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                aria-label="Date"
                type="date"
                value={formData.start_date?.slice(0, 10) || ''}
                onChange={(e) => {
                  const nextDate = e.target.value || null;
                  setFormData((prev) => ({
                    ...prev,
                    start_date: nextDate,
                    ...(!nextDate
                      ? { start_time: null, end_date: null, end_time: null }
                      : {}),
                  }));
                }}
                className="w-full min-w-0 box-border appearance-none bg-gray-50 py-3 pl-9 pr-2 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100"
              />
            </div>

            {renderStatusSelect()}
          </div>

          {/* Type */}
          {isPiece && (
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                aria-label="Type"
                value={formData.type || 'Event'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full bg-gray-50 py-3 pl-11 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 appearance-none"
              >
                <option value="Task">Task</option>
                <option value="Event">Event</option>
                <option value="Note">Note</option>
              </select>
            </div>
          )}

          {/* Note */}
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <textarea
              value={formData.note || ''}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Add a note..."
              className="w-full bg-gray-50 py-3 pl-11 pr-3 rounded-xl text-sm text-gray-700 font-medium focus:outline-none border border-gray-100 min-h-20 resize-none"
            />
          </div>

          {/* URL */}
          {renderUrlField()}

          {/* People */}
          {renderPeopleSection()}

          {/* fkw array */}
          {formData.fkw && formData.fkw.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.fkw.map((tag) => (
                <span key={tag} className="trails-badge">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ==== 下部ボタン ==== */}
        <div className="p-6 pt-4 border-t border-gray-100 bg-white flex gap-3">
          {isSaveBtnNeeds && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isDeleting || hasInvalidSchedule}
              className="trails-btn-primary w-full py-3.5"
            >
              {isSaving ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="trails-btn-secondary w-full py-3.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
