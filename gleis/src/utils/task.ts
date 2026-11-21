import { TaskStatus } from '@/types';

export const WEEK_DAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

export const COLUMNS = ['Overdue', ...WEEK_DAYS] as const;

export const STATUS_ORDER: Record<string, number> = {
  INBOX: 1,
  Going: 2,
  Waiting: 3,
  Wrapper: 4,
};

export const getStatusColor = (status: TaskStatus): string => {
  if (status === 'INBOX') return 'bg-red-500';
  if (status === 'Waiting') return 'bg-orange-500';
  if (status === 'Going') return 'bg-purple-500';
  if (status === 'Wrapper') return 'bg-blue-500';
  if (status === 'Done') return 'bg-green-500';
  return 'bg-gray-500';
};

export const sortTasksByStatus = <T extends { status?: string; title?: string }>(
  tasks: T[],
): T[] => {
  return [...tasks].sort((a, b) => {
    const statusA = a.status || '';
    const statusB = b.status || '';

    const priorityA = STATUS_ORDER[statusA] || 99;
    const priorityB = STATUS_ORDER[statusB] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return (a.title || '').localeCompare(b.title || '', 'ja');
  });
};

export const sortByStartDate = <T extends { start_date?: string | null }>(
  items: T[],
  order: 'asc' | 'desc' = 'asc',
): T[] =>
  [...items].sort((a, b) => {
    const dateA = a.start_date ? Date.parse(a.start_date) : NaN;
    const dateB = b.start_date ? Date.parse(b.start_date) : NaN;
    const hasDateA = !Number.isNaN(dateA);
    const hasDateB = !Number.isNaN(dateB);

    if (!hasDateA || !hasDateB) {
      if (hasDateA === hasDateB) return 0;
      return hasDateA ? -1 : 1;
    }

    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });

export const getPieceDateRangeUpdate = (
  originalStartDate: string | null | undefined,
  originalEndDate: string | null | undefined,
  newStartDate: string,
) => {
  if (!newStartDate) {
    return {
      start_date: null,
      ...(originalEndDate ? { end_date: null } : {}),
    };
  }

  const originalStartDateKey =
    originalStartDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const originalEndDateKey = originalEndDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!originalStartDateKey || !originalEndDateKey) {
    return { start_date: newStartDate };
  }

  const originalStart = new Date(`${originalStartDateKey}T00:00:00Z`);
  const originalEnd = new Date(`${originalEndDateKey}T00:00:00Z`);
  const newStart = new Date(`${newStartDate}T00:00:00Z`);
  if (
    Number.isNaN(originalStart.getTime()) ||
    Number.isNaN(originalEnd.getTime()) ||
    Number.isNaN(newStart.getTime())
  ) {
    return { start_date: newStartDate };
  }

  const duration = originalEnd.getTime() - originalStart.getTime();
  const newEndDate = new Date(newStart.getTime() + duration)
    .toISOString()
    .slice(0, 10);
  return { start_date: newStartDate, end_date: newEndDate };
};

type NotionScheme = 'notion' | 'https';

export const getNotionLinkById = (
  id: string,
  scheme: NotionScheme = 'https',
): string => `${scheme}://notion.so/${id.replace(/-/g, '')}`;
