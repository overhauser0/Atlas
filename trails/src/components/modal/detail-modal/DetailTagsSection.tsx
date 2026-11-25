'use client';

import { useMemo, useState } from 'react';
import { Flag, Hash, MapPin, Plus, Search, Tag, X } from 'lucide-react';
import { JP_PREFS, normalizePref } from '@/utils/prefecture';

const TOPIC_PRESETS = [
  'Travel',
  'Drinking',
  'Climbing',
  'R-Escape',
  'Golf',
  'Article',
  'Liqueur',
] as const;

const FLAG_PRESETS = ['Bucket'] as const;

interface DetailTagsSectionProps {
  topics: string[];
  flags: string[];
  fkw: string[];
  prefs: string[];
  onChange: (updates: {
    topics?: string[];
    flags?: string[];
    fkw?: string[];
    prefs?: string[];
  }) => void;
}

export default function DetailTagsSection({
  topics,
  flags,
  fkw,
  prefs,
  onChange,
}: DetailTagsSectionProps) {
  const [topicDraft, setTopicDraft] = useState('');
  const [flagDraft, setFlagDraft] = useState('');
  const [fkwDraft, setFkwDraft] = useState('');
  const [prefQuery, setPrefQuery] = useState('');
  const [isPrefPickerOpen, setIsPrefPickerOpen] = useState(false);

  const toggleItem = (list: string[], value: string): string[] =>
    list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];

  const addUnique = (
    list: string[],
    raw: string,
    key: 'topics' | 'flags' | 'fkw',
    reset: () => void,
  ) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (!list.includes(trimmed)) {
      onChange({ [key]: [...list, trimmed] });
    }
    reset();
  };

  const customTopics = topics.filter(
    (topic) => !(TOPIC_PRESETS as readonly string[]).includes(topic),
  );
  const customFlags = flags.filter(
    (flag) => !(FLAG_PRESETS as readonly string[]).includes(flag),
  );

  const normalizedSelectedPrefs = useMemo(
    () => new Set(prefs.map((pref) => normalizePref(pref))),
    [prefs],
  );

  const filteredPrefs = useMemo(() => {
    const query = prefQuery.trim();
    if (!query) return JP_PREFS;
    return JP_PREFS.filter((cell) => cell.name.includes(query));
  }, [prefQuery]);

  const handleTogglePref = (prefName: string) => {
    const normalizedTarget = normalizePref(prefName);
    const exists = prefs.some(
      (existing) => normalizePref(existing) === normalizedTarget,
    );
    if (exists) {
      onChange({
        prefs: prefs.filter(
          (existing) => normalizePref(existing) !== normalizedTarget,
        ),
      });
    } else {
      onChange({ prefs: [...prefs, prefName] });
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-primary-500" />
        <span className="trails-section-label">Tags &amp; Attributes</span>
      </div>

      {/* Topics */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-gray-500">Topics</span>
        <div className="flex flex-wrap gap-1.5">
          {TOPIC_PRESETS.map((topic) => {
            const active = topics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ topics: toggleItem(topics, topic) })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {topic}
              </button>
            );
          })}
          {customTopics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
            >
              {topic}
              <button
                type="button"
                aria-label={`${topic}を削除`}
                onClick={() =>
                  onChange({ topics: topics.filter((t) => t !== topic) })
                }
                className="text-primary-500 hover:text-primary-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            aria-label="Add topic"
            value={topicDraft}
            onChange={(e) => setTopicDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addUnique(topics, topicDraft, 'topics', () =>
                  setTopicDraft(''),
                );
              }
            }}
            placeholder="カスタム Topic を追加..."
            className="flex-1 min-w-0 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            aria-label="Topicを追加"
            disabled={!topicDraft.trim()}
            onClick={() =>
              addUnique(topics, topicDraft, 'topics', () => setTopicDraft(''))
            }
            className="rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Flags */}
      <div className="space-y-2 border-t border-gray-100 pt-3.5">
        <div className="flex items-center gap-1.5">
          <Flag className="w-3 h-3 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-500">Flags</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FLAG_PRESETS.map((flag) => {
            const active = flags.includes(flag);
            return (
              <button
                key={flag}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ flags: toggleItem(flags, flag) })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {flag}
              </button>
            );
          })}
          {customFlags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600"
            >
              {flag}
              <button
                type="button"
                aria-label={`${flag}を削除`}
                onClick={() =>
                  onChange({ flags: flags.filter((f) => f !== flag) })
                }
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            aria-label="Add flag"
            value={flagDraft}
            onChange={(e) => setFlagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addUnique(flags, flagDraft, 'flags', () => setFlagDraft(''));
              }
            }}
            placeholder="カスタム Flag を追加..."
            className="flex-1 min-w-0 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            aria-label="Flagを追加"
            disabled={!flagDraft.trim()}
            onClick={() =>
              addUnique(flags, flagDraft, 'flags', () => setFlagDraft(''))
            }
            className="rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FreeKeyWord (fkw) */}
      <div className="space-y-2 border-t border-gray-100 pt-3.5">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-gray-400" />
          <span className="text-[11px] font-semibold text-gray-500">
            Keywords
          </span>
        </div>
        {fkw.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {fkw.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                #{keyword}
                <button
                  type="button"
                  aria-label={`${keyword}を削除`}
                  onClick={() =>
                    onChange({ fkw: fkw.filter((item) => item !== keyword) })
                  }
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            type="text"
            aria-label="Add keyword"
            value={fkwDraft}
            onChange={(e) => setFkwDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addUnique(fkw, fkwDraft, 'fkw', () => setFkwDraft(''));
              }
            }}
            placeholder="キーワードを追加 (Enter)..."
            className="flex-1 min-w-0 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            aria-label="キーワードを追加"
            disabled={!fkwDraft.trim()}
            onClick={() =>
              addUnique(fkw, fkwDraft, 'fkw', () => setFkwDraft(''))
            }
            className="rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Prefectures (prefs) */}
      <div className="space-y-2 border-t border-gray-100 pt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-500">
              Prefectures
            </span>
          </div>
          <button
            type="button"
            aria-expanded={isPrefPickerOpen}
            onClick={() => setIsPrefPickerOpen((open) => !open)}
            className="text-[11px] font-semibold text-primary-600 hover:text-primary-700"
          >
            {isPrefPickerOpen ? '閉じる' : '都道府県を選択'}
          </button>
        </div>

        {prefs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prefs.map((pref) => (
              <span
                key={pref}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
              >
                {pref}
                <button
                  type="button"
                  aria-label={`${pref}を削除`}
                  onClick={() => handleTogglePref(pref)}
                  className="text-sky-400 hover:text-sky-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isPrefPickerOpen && (
          <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                aria-label="Search prefectures"
                value={prefQuery}
                onChange={(e) => setPrefQuery(e.target.value)}
                placeholder="都道府県を検索..."
                className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-gray-700 focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div className="max-h-36 overflow-y-auto trails-scrollbar flex flex-wrap gap-1">
              {filteredPrefs.map((cell) => {
                const selected = normalizedSelectedPrefs.has(cell.name);
                return (
                  <button
                    key={cell.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleTogglePref(cell.name)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                      selected
                        ? 'border-sky-300 bg-sky-100 text-sky-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cell.name}
                  </button>
                );
              })}
              {filteredPrefs.length === 0 && (
                <p className="w-full py-2 text-center text-xs text-gray-400">
                  該当する都道府県がありません
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
