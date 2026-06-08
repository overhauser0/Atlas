export const WEEK_DAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

export const COLUMNS = ['Overdue', ...WEEK_DAYS];

// ステータスの優先順位定義
export const STATUS_ORDER: Record<string, number> = {
  INBOX: 1,
  Going: 2,
  Waiting: 3,
  Wrapper: 4,
};

export const getStatusColor = (status: string) => {
  if (status === 'INBOX') return 'bg-red-500';
  if (status === 'Waiting') return 'bg-orange-500';
  if (status === 'Going') return 'bg-purple-500';
  if (status === 'Wrapper') return 'bg-blue-500';
  if (status === 'Done') return 'bg-green-500';
  return 'bg-gray-500';
};

export const sortTasksByStatus = (tasks: any[]) => {
  return tasks.sort((a, b) => {
    const statusA = a.status || '';
    const statusB = b.status || '';

    // ステータスの優先度比較
    const priorityA = STATUS_ORDER[statusA] || 99;
    const priorityB = STATUS_ORDER[statusB] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 同一ステータス内の場合はタイトル順（昇順）
    return (a.title || '').localeCompare(b.title || '', 'ja');
  });
};
