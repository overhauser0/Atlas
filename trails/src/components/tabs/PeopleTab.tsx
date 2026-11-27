'use client';

import { useEffect, useState } from 'react';
import {
  ContactRound,
  Image,
  Plus,
  RefreshCw,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import { LifeItem, Person } from '@/types';
import { formatPersonName, formatPersonRuby } from '@/utils/person';
import PageHeader from '@/components/ui/PageHeader';
import PersonEditor from '@/components/tabs/PersonEditor';

const japaneseCollator = new Intl.Collator('ja', { sensitivity: 'base' });

interface PeopleTabProps {
  people: Person[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  initialPersonId?: string | null;
  onClearInitialPersonId?: () => void;
  items?: LifeItem[];
  onOpenPiece?: (item: LifeItem) => void;
}

export default function PeopleTab({
  people,
  isLoading,
  error,
  onRefresh,
  initialPersonId = null,
  onClearInitialPersonId,
  items = [],
  onOpenPiece,
}: PeopleTabProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isPersonViewOpen, setIsPersonViewOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!initialPersonId) return;
    const match = people.find((person) => person.id === initialPersonId);
    if (match) {
      setSelectedPerson(match);
      setIsPersonViewOpen(true);
      onClearInitialPersonId?.();
    }
  }, [initialPersonId, people, onClearInitialPersonId]);

  const closePersonView = () => {
    setIsPersonViewOpen(false);
    setSelectedPerson(null);
    onClearInitialPersonId?.();
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
        items={items}
        onOpenPiece={onOpenPiece}
        onClose={closePersonView}
        onSaved={(savedPerson) => {
          if (savedPerson) setSelectedPerson(savedPerson);
          void onRefresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
      <PageHeader
        icon={<UsersRound />}
        title="People"
        subtitle={`${people.length}人の人物`}
        actions={
          <>
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isLoading}
              aria-label="人物一覧を更新"
              className="trails-nav-icon-btn"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPerson(null);
                setIsPersonViewOpen(true);
              }}
              className="trails-btn-primary"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </>
        }
      />

      {isLoading && people.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto pb-32 no-scrollbar">
          <div className="trails-card p-8 text-center text-sm font-medium text-gray-400 animate-pulse">
            人物一覧を読み込み中...
          </div>
        </div>
      ) : error ? (
        <div className="min-h-0 flex-1 overflow-y-auto pb-32 no-scrollbar">
          <div className="trails-card p-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="mt-4 text-sm font-bold text-primary-600 hover:text-primary-700"
            >
              再試行
            </button>
          </div>
        </div>
      ) : people.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto pb-32 no-scrollbar">
          <div className="trails-card p-10 text-center">
            <UsersRound className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">登録された人物はいません</p>
          </div>
        </div>
      ) : (
        <>
          <section
            aria-label="人物の検索と絞り込み"
            className="trails-card mb-4 shrink-0 space-y-3 p-4 md:p-5"
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="名前で検索"
                aria-label="名前で検索"
                className="trails-input pl-10 pr-10"
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
                <p className="trails-section-label mb-2">Tags</p>
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
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-700'
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

          <div className="min-h-0 flex-1 overflow-y-auto pb-32 no-scrollbar">
            {filteredPeople.length === 0 ? (
              <div className="trails-card p-8 text-center">
                <p className="text-sm text-gray-500">
                  条件に一致する人物はいません
                </p>
              </div>
            ) : (
              <div className="trails-card divide-y divide-gray-100 overflow-hidden">
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
                    className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-gray-900">
                        {formatPersonName(person)}
                      </h2>
                      {(person.ruby_family_name || person.ruby_given_name) && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {formatPersonRuby(person)}
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
                    {(person.immich_person_id || person.google_contact_id) && (
                      <div
                        className="flex shrink-0 items-center gap-2"
                        role="img"
                        aria-label={[
                          person.immich_person_id && 'Immich連携済み',
                          person.google_contact_id &&
                            'Google Contacts連携済み',
                        ]
                          .filter(Boolean)
                          .join('、')}
                      >
                        {person.immich_person_id && (
                          <span title="Immich連携済み">
                            <Image
                              className="h-5 w-5 text-primary-600"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        {person.google_contact_id && (
                          <span title="Google Contacts連携済み">
                            <ContactRound
                              className="h-5 w-5 text-blue-600"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
