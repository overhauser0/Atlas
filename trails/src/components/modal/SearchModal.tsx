'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight, Search, UsersRound, X } from 'lucide-react';
import { LifeItem, Person } from '@/types';
import { GoogleEvent } from '@/hooks/useGoogleCalendar';
import { formatPersonName, formatPersonRuby } from '@/utils/person';
import ListItem from '@/components/ui/ListItem';

interface SearchModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  items: LifeItem[];
  googleEvents: GoogleEvent[];
  people: Person[];
  onItemClick: (item: LifeItem) => void;
  onPersonClick: (person: Person) => void;
}

type SearchScope = 'all' | 'pieces' | 'people';

type SearchResultEntry =
  | { kind: 'person'; id: string; person: Person }
  | { kind: 'item'; id: string; item: LifeItem };

export default function SearchModal({
  isOpen,
  initialQuery = '',
  onClose,
  items,
  googleEvents,
  people,
  onItemClick,
  onPersonClick,
}: SearchModalProps) {
  const [search, setSearch] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // ====== データの統合 ======
  const allItems = useMemo(() => {
    const gcalMapped: LifeItem[] = (googleEvents || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      note: ev.note || '',
      start_date: ev.start_date,
      start_time: ev.start_time,
      end_date: ev.end_date,
      end_time: ev.end_time,
      type: 'Event',
      source: 'GCAL',
      iconType: 'Calendar',
      url: ev.url || '',
      status: 'Done',
      area: '',
      topics: [],
      flags: [],
      fkw: [],
      prefs: [],
      imageUrl: '',
      category: [],
    }));

    return [...items, ...gcalMapped];
  }, [items, googleEvents]);

  // ====== 検索フィルタリング ======
  const normalizedQuery = search
    .trim()
    .replace(/^#/, '')
    .toLocaleLowerCase('ja');

  const filteredPeople = useMemo(() => {
    if (!normalizedQuery) return [];
    return people.filter((person) => {
      const searchable = [
        person.family_name,
        person.given_name,
        person.ruby_family_name,
        person.ruby_given_name,
        person.notes,
        ...(person.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ja');
      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, people]);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return [];
    return allItems.filter(
      (item) =>
        item.title?.toLocaleLowerCase('ja').includes(normalizedQuery) ||
        item.note?.toLocaleLowerCase('ja').includes(normalizedQuery) ||
        item.fkw?.some((tag: string) =>
          tag.toLocaleLowerCase('ja').includes(normalizedQuery),
        ) ||
        item.topics?.some((topic: string) =>
          topic.toLocaleLowerCase('ja').includes(normalizedQuery),
        ) ||
        item.prefs?.some((pref: string) =>
          pref.toLocaleLowerCase('ja').includes(normalizedQuery),
        ),
    );
  }, [normalizedQuery, allItems]);

  const results = useMemo<SearchResultEntry[]>(() => {
    const entries: SearchResultEntry[] = [];
    if (scope === 'all' || scope === 'people') {
      filteredPeople.forEach((person) =>
        entries.push({ kind: 'person', id: `person:${person.id}`, person }),
      );
    }
    if (scope === 'all' || scope === 'pieces') {
      filteredItems.forEach((item) =>
        entries.push({
          kind: 'item',
          id: `item:${item.source ?? 'ITEM'}:${item.id}`,
          item,
        }),
      );
    }
    return entries;
  }, [scope, filteredPeople, filteredItems]);

  // ====== キーボードナビゲーション ======
  useEffect(() => {
    setActiveIndex(0);
  }, [search, scope]);

  useEffect(() => {
    if (isOpen) {
      setSearch(initialQuery);
      setScope('all');
      setTimeout(() => {
        inputRef.current?.focus();
        if (initialQuery) {
          inputRef.current?.setSelectionRange(
            initialQuery.length,
            initialQuery.length,
          );
        }
      }, 10);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % results.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = results[activeIndex];
          if (selected) {
            if (selected.kind === 'person') {
              onPersonClick(selected.person);
            } else {
              onItemClick(selected.item);
            }
            onClose();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, activeIndex, onClose, onItemClick, onPersonClick]);

  if (!isOpen) return null;

  const visiblePeopleCount =
    scope === 'all' || scope === 'people' ? filteredPeople.length : 0;
  const visibleItemCount =
    scope === 'all' || scope === 'pieces' ? filteredItems.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      {/* 背景オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="trails-modal-panel relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 検索入力エリア */}
        <div className="flex shrink-0 items-center border-b border-gray-100 px-4 py-4">
          <Search className="mr-3 h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pieces, events, people..."
            className="flex-1 border-none bg-transparent text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              aria-label="検索をクリア"
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* スコープ切替バー */}
        {normalizedQuery && (
          <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-100 bg-gray-50/70 px-4 py-2">
            {(
              [
                {
                  id: 'all',
                  label: `すべて (${filteredPeople.length + filteredItems.length})`,
                },
                { id: 'people', label: `People (${filteredPeople.length})` },
                { id: 'pieces', label: `Piece (${filteredItems.length})` },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setScope(option.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  scope === option.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* 結果表示エリア */}
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          {results.length > 0 ? (
            <div className="flex flex-col">
              {visiblePeopleCount > 0 && (
                <>
                  <p className="trails-section-label px-4 pt-2 pb-1.5">
                    People ({visiblePeopleCount})
                  </p>
                  {results
                    .map((entry, index) => ({ entry, index }))
                    .filter(
                      (
                        row,
                      ): row is {
                        entry: Extract<SearchResultEntry, { kind: 'person' }>;
                        index: number;
                      } => row.entry.kind === 'person',
                    )
                    .map(({ entry, index }) => {
                      const isActive = index === activeIndex;
                      const { person } = entry;
                      const ruby = formatPersonRuby(person);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => {
                            onPersonClick(person);
                            onClose();
                          }}
                          className={`mx-2 flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition-colors ${
                            isActive
                              ? 'bg-primary-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                            <UsersRound className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-900">
                              {formatPersonName(person)}
                            </p>
                            {ruby && (
                              <p className="truncate text-xs text-gray-500">
                                {ruby}
                              </p>
                            )}
                            {person.tags && person.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {person.tags.slice(0, 4).map((tag) => (
                                  <span key={tag} className="trails-badge">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                        </button>
                      );
                    })}
                </>
              )}

              {visibleItemCount > 0 && (
                <>
                  <p
                    className={`trails-section-label px-4 pb-1.5 ${
                      visiblePeopleCount > 0 ? 'pt-4' : 'pt-2'
                    }`}
                  >
                    Pieces &amp; Events ({visibleItemCount})
                  </p>
                  {results
                    .map((entry, index) => ({ entry, index }))
                    .filter(
                      (
                        row,
                      ): row is {
                        entry: Extract<SearchResultEntry, { kind: 'item' }>;
                        index: number;
                      } => row.entry.kind === 'item',
                    )
                    .map(({ entry, index }) => {
                      const isActive = index === activeIndex;
                      return (
                        <ListItem
                          key={entry.id}
                          item={entry.item}
                          description={entry.item.note || undefined}
                          isActive={isActive}
                          onMouseEnter={() => setActiveIndex(index)}
                          className="mx-2 rounded-xl"
                          onItemClick={() => {
                            onItemClick(entry.item);
                            onClose();
                          }}
                        />
                      );
                    })}
                </>
              )}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              {normalizedQuery
                ? 'No results found.'
                : 'Start typing to search...'}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex shrink-0 justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-[10px] font-medium text-gray-400">
          <span>↑↓ to navigate • Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
