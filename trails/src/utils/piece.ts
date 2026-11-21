import { LifeItem } from '@/types';

export const sortByStartDate = <T extends { start_date?: string | null }>(
  items: T[],
  order: 'asc' | 'desc' = 'asc',
  missingDateOrder: 'first' | 'last' = 'last',
): T[] =>
  [...items].sort((a, b) => {
    const dateA = a.start_date ? Date.parse(a.start_date) : NaN;
    const dateB = b.start_date ? Date.parse(b.start_date) : NaN;
    const hasDateA = !Number.isNaN(dateA);
    const hasDateB = !Number.isNaN(dateB);

    if (!hasDateA || !hasDateB) {
      if (hasDateA === hasDateB) return 0;
      if (missingDateOrder === 'first') return hasDateA ? 1 : -1;
      return hasDateA ? -1 : 1;
    }

    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });

export const groupItemsByYear = (items: LifeItem[]) => {
  const grouped: Record<string, LifeItem[]> = {};
  const sortedItems = sortByStartDate(items, 'desc', 'first');

  sortedItems.forEach((item) => {
    const key = item.start_date ? item.start_date.substring(0, 4) : 'PLAN';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return grouped;
};

export const markCategory = (item: LifeItem): string[] => {
  const categories: string[] = [];
  if (item.flags?.includes('Bucket')) categories.push('Bucket');
  if (item.topics?.includes('Travel')) categories.push('Travel');
  return categories;
};

export const judgeDefaultIcon = (item: LifeItem): string => {
  if (item.type === 'Task') return 'CheckSquare';
  if (item.topics?.includes('Travel')) return 'Plane';
  if (item.flags?.includes('Bucket')) {
    return item.status === 'Done' ? 'BadgeCheck' : 'Archive';
  }
  if (item.topics?.includes('Article')) return 'Newspaper';
  if (item.topics?.includes('Drinking')) return 'Beer';
  if (item.topics?.includes('Golf')) return 'LandPlot';
  if (item.topics?.includes('R-Escape')) return 'Lightbulb';
  if (item.topics?.includes('Climbing')) return 'Mountain';
  if (item.topics?.includes('Liqueur')) return 'Wine';

  return 'Leaf';
};

export const getStatusColor = (status: string): string => {
  if (status === 'INBOX') return 'bg-red-500';
  if (status === 'Waiting') return 'bg-orange-500';
  if (status === 'Going') return 'bg-purple-500';
  if (status === 'Done') return 'bg-green-500';
  return 'bg-gray-500';
};

type NotionScheme = 'notion' | 'https';

export const getNotionLinkById = (
  id: string,
  scheme: NotionScheme = 'https',
): string => `${scheme}://notion.so/${id.replace(/-/g, '')}`;
