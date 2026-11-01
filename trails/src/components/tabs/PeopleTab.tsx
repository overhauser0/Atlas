'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search, UsersRound, X } from 'lucide-react';
import { Person } from '@/types';
import { atlasFetch } from '@/utils/api';
import PersonEditor from '@/components/tabs/PersonEditor';

const japaneseCollator = new Intl.Collator('ja', { sensitivity: 'base' });

export default function PeopleTab() {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isPersonViewOpen, setIsPersonViewOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchPeople = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await atlasFetch('/people', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`人物一覧の取得に失敗しました (${response.status})`);
      }

      const data: { people: Person[] } = await response.json();
      if (!Array.isArray(data.people)) {
        throw new Error('人物一覧のレスポンス形式が正しくありません');
      }
      setPeople(data.people);
    } catch (fetchError) {
      console.error('Failed to fetch people:', fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : '人物一覧の取得に失敗しました',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    const handleRefreshPeople = () => {
      void fetchPeople();
    };

    window.addEventListener('refresh_people', handleRefreshPeople);
    return () => {
      window.removeEventListener('refresh_people', handleRefreshPeople);
    };
  }, [fetchPeople]);

  const closePersonView = () => {
    setIsPersonViewOpen(false);
    setSelectedPerson(null);
  };

  const availableTags = Array.from(
    new Set(people.flatMap((person) => person.tags ?? []).filter(Boolean)),
  ).sort(japaneseCollator.compare);
  const normalizedQuery = nameQuery.trim().toLocaleLowerCase('ja');
  const filteredPeople = people
    .filter((person) => {
      const matchesName =
        !normalizedQuery ||
        [
          person.family_name,
          person.given_name,
          person.ruby_family_name,
          person.ruby_given_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('ja')
          .includes(normalizedQuery);
      const personTags = person.tags ?? [];
      const matchesTags = selectedTags.every((tag) => personTags.includes(tag));
      return matchesName && matchesTags;
    })
    .sort((a, b) => {
      const aRuby = a.ruby_family_name?.trim() ?? '';
      const bRuby = b.ruby_family_name?.trim() ?? '';
      if (!aRuby && bRuby) return 1;
      if (aRuby && !bRuby) return -1;
      const familyOrder = japaneseCollator.compare(aRuby, bRuby);
      if (familyOrder !== 0) return familyOrder;
      return japaneseCollator.compare(
        [a.ruby_given_name, a.given_name].filter(Boolean).join(' '),
        [b.ruby_given_name, b.given_name].filter(Boolean).join(' '),
      );
    });

  if (isPersonViewOpen) {
    return (
      <PersonEditor
        person={selectedPerson}
        onClose={closePersonView}
        onSaved={(savedPerson) => {
          if (savedPerson) setSelectedPerson(savedPerson);
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-4xl min-h-0 flex-col p-4 md:p-8">
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">People</h1>
            <p className="text-sm text-gray-500 mt-1">人物一覧</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchPeople()}
              disabled={isLoading}
              aria-label="人物一覧を更新"
              className="p-2.5 rounded-xl text-gray-500 hover:bg-white disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPerson(null);
                setIsPersonViewOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </div>
        </div>

        {isLoading && people.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto trails-scrollbar">
            <p className="py-8 text-center text-sm text-gray-500">
              人物一覧を読み込み中...
            </p>
          </div>
        ) : error ? (
          <div className="min-h-0 flex-1 overflow-y-auto trails-scrollbar">
            <div className="rounded-2xl bg-white p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void fetchPeople()}
                className="mt-4 text-sm font-bold text-primary-600 hover:text-primary-700"
              >
                再試行
              </button>
            </div>
          </div>
        ) : people.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto trails-scrollbar">
            <div className="rounded-2xl bg-white p-8 text-center">
              <UsersRound className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                登録された人物はいません
              </p>
            </div>
          </div>
        ) : (
          <>
            <section
              aria-label="人物の検索と絞り込み"
              className="mb-4 shrink-0 space-y-3 rounded-2xl bg-white p-4"
            >
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="名前で検索"
                  aria-label="名前で検索"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-amber-400 focus:bg-white"
                />
                {nameQuery && (
                  <button
                    type="button"
                    onClick={() => setNameQuery('')}
                    aria-label="名前検索をクリア"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>

              {availableTags.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    タグで絞り込み
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            setSelectedTags((current) =>
                              isSelected
                                ? current.filter((item) => item !== tag)
                                : [...current, tag],
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-700'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                    {selectedTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTags([])}
                        className="rounded-full px-2 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      >
                        タグをクリア
                      </button>
                    )}
                  </div>
                  {selectedTags.length > 1 && (
                    <p className="mt-2 text-xs text-gray-400">
                      選択したすべてのタグを持つ人物を表示します
                    </p>
                  )}
                </div>
              )}
            </section>

            <div className="min-h-0 flex-1 overflow-y-auto trails-scrollbar">
              {filteredPeople.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center">
                  <p className="text-sm text-gray-500">
                    条件に一致する人物はいません
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                  {filteredPeople.map((person) => (
                    <article
                      key={person.id}
                      onClick={() => {
                        setSelectedPerson(person);
                        setIsPersonViewOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPerson(person);
                          setIsPersonViewOpen(true);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="flex cursor-pointer items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <UsersRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-bold text-gray-900">
                          {[person.family_name, person.given_name]
                            .filter(Boolean)
                            .join(' ')}
                        </h2>
                        {(person.ruby_family_name ||
                          person.ruby_given_name) && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {[person.ruby_family_name, person.ruby_given_name]
                              .filter(Boolean)
                              .join(' ')}
                          </p>
                        )}
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
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
