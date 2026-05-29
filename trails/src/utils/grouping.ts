import { LifeItem } from '@/types';

export const groupItemsByYear = (items: LifeItem[]) => {
  const grouped: { [key: string]: LifeItem[] } = {};

  // 1. 日付の新しい順（降順）にソート。Dateが無いものは一番上(PLAN)に。
  const sortedItems = [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return -1;
    if (!b.date) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // 2. 年ごとに振り分け
  sortedItems.forEach((item) => {
    const key = item.date ? item.date.substring(0, 4) : 'PLAN';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return grouped;
};

export const markCategory = (item: LifeItem) => {
  const c = [];
  if (item.flags?.includes('Bucket')) c.push('Bucket');
  if (item.topics?.includes('Travel')) c.push('Travel');
  const isExplore = item.topics?.some((topic: string) =>
    ['Drinking', 'Climbing', 'R-Escape'].includes(topic),
  );
  if (isExplore) c.push('Explore');
  return c;
};
