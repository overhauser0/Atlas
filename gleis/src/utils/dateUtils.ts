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

export const isPastDate = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

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

  if (!originalStartDate || !originalEndDate) {
    return { start_date: newStartDate };
  }

  const originalStart = new Date(`${originalStartDate}T00:00:00Z`);
  const originalEnd = new Date(`${originalEndDate}T00:00:00Z`);
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

export const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

type Separator = 'slash' | 'hyphen' | 'none';

const formatDate = (
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  separator: Separator = 'slash',
): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '';
    }

    const baseDateString = new Intl.DateTimeFormat('ja-JP', {
      ...options,
      timeZone: 'Asia/Tokyo',
    }).format(d);

    switch (separator) {
      case 'hyphen':
        return baseDateString.replace(/\//g, '-');
      case 'none':
        return baseDateString.replace(/\//g, '');
      case 'slash':
      default:
        return baseDateString;
    }
  } catch {
    return '';
  }
};

export const getDateFullString = (
  date: Date | string | null | undefined,
  separator: Separator = 'slash',
): string =>
  formatDate(
    date,
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    separator,
  );

export const getDateShortString = (
  date: Date | string | null | undefined,
  separator: Separator = 'slash',
): string => formatDate(date, { month: '2-digit', day: '2-digit' }, separator);
