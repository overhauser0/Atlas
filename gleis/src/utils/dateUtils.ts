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

// --- 「今週の月曜日（0時0分0秒）」を取得する共通関数 ---
export const getThisWeekMonday = (baseDate: Date = new Date()): Date => {
  const d = new Date(baseDate);
  const dayOfWeek = d.getDay();
  // 日曜(0)なら6日前、それ以外なら(曜日-1)日前が月曜日
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 今週の月曜日以前かどうかを判定する関数
export const isOverdue = (dueDateStr: string | null): boolean => {
  if (!dueDateStr) return true; // 日付未定はOverdue(Inbox)扱い
  const taskDate = new Date(dueDateStr);
  taskDate.setHours(0, 0, 0, 0);
  const thisMonday = getThisWeekMonday();
  return taskDate < thisMonday;
};

export const mergeNewDateWithOriginalTime = (
  originalDateStr: string | null,
  newDateStr: string,
): string | null => {
  if (!newDateStr) return null;
  if (originalDateStr && originalDateStr.includes('T')) {
    const timeMatch = originalDateStr.match(/T(\d{2}:\d{2}:\d{2}(\.\d+)?)/);
    const timePart = timeMatch ? timeMatch[1] : '09:00:00.000';
    return `${newDateStr}T${timePart}+09:00`;
  }
  return newDateStr;
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
