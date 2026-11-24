'use client';

import type { ReactNode } from 'react';
import {
  Archive,
  Beer,
  CheckSquare,
  LandPlot,
  Lightbulb,
  Mountain,
  Newspaper,
  Plane,
  Wine,
} from 'lucide-react';
import type { ItemTabPreset, LifeItem, Views } from '@/types';
import JapanMapWidget from '@/components/JapanMapWidget';
import ListItem from '@/components/ui/ListItem';
import type { YearItemSummary } from './computeYearReview';

const TOPIC_ICONS: Record<ItemTabPreset, ReactNode> = {
  Travel: <Plane className="w-4 h-4" />,
  Drinking: <Beer className="w-4 h-4" />,
  Climbing: <Mountain className="w-4 h-4" />,
  'R-Escape': <Lightbulb className="w-4 h-4" />,
  Golf: <LandPlot className="w-4 h-4" />,
  Article: <Newspaper className="w-4 h-4" />,
  Liqueur: <Wine className="w-4 h-4" />,
  Bucket: <Archive className="w-4 h-4" />,
  Task: <CheckSquare className="w-4 h-4" />,
};

interface TopicAndMapSectionProps {
  selectedYear: number;
  itemSummary: YearItemSummary;
  onNavigate: (tab: Views) => void;
  onItemClick: (item: LifeItem) => void;
}

export default function TopicAndMapSection({
  selectedYear,
  itemSummary,
  onNavigate,
  onItemClick,
}: TopicAndMapSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Categories
          </p>
          <h2 className="text-lg font-bold text-gray-900">
            トピック別ハイライト
          </h2>
        </div>

        {itemSummary.topicCounts.every((t) => t.count === 0) ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {selectedYear}年の記録はまだありません
          </div>
        ) : (
          <div className="space-y-3">
            {itemSummary.topicCounts
              .filter((t) => t.count > 0)
              .map((topic) => {
                const percent = Math.round(
                  (topic.count / itemSummary.maxTopicCount) * 100,
                );
                return (
                  <button
                    key={topic.preset}
                    type="button"
                    onClick={() => onNavigate(topic.preset)}
                    className="w-full text-left group rounded-2xl p-2 -mx-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${topic.badgeClass}`}
                        >
                          {TOPIC_ICONS[topic.preset]}
                        </span>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-gray-950 truncate">
                          {topic.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-600 tabular-nums shrink-0">
                        {topic.count}件
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${topic.barClass}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
          </div>
        )}

        {itemSummary.bucketAchieved.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Bucket List Achieved ({itemSummary.bucketAchieved.length})
            </p>
            <div className="divide-y divide-gray-100 -mx-2">
              {itemSummary.bucketAchieved.slice(0, 5).map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  icon="BadgeCheck"
                  iconClassName="text-emerald-500"
                  slim
                  onItemClick={() => onItemClick(item)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="space-y-4">
        <JapanMapWidget
          data={itemSummary.yearEvents}
          onItemClick={onItemClick}
          subtitle={`${selectedYear} Japan Map`}
          title="Footprints"
          headerRight={
            <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold tabular-nums">
              {itemSummary.visitedPrefsCount} / 47
            </span>
          }
        />

        {itemSummary.hasPriorPrefHistory &&
          itemSummary.firstTimePrefs.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                First Visit in {selectedYear}
              </p>
              <div className="flex flex-wrap gap-2">
                {itemSummary.firstTimePrefs.map((pref) => (
                  <span
                    key={pref}
                    className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold"
                  >
                    {pref}
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
