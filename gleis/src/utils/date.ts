type Separator = 'slash' | 'hyphen' | 'none';

/** 今週の月曜日（0時0分0秒）を取得する */
export const getThisWeekMonday = (baseDate: Date = new Date()): Date => {
  const d = new Date(baseDate);
  const dayOfWeek = d.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getCalendarDateKey = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
    if (dateOnly && value.length === 10) return dateOnly[1];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
};

export const addCalendarDays = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getThisWeekMondayDateKey = (
  baseDate: Date = new Date(),
): string => {
  const dateKey = getCalendarDateKey(baseDate);
  if (!dateKey) throw new Error('Invalid date for week calculation');
  const dayOfWeek = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return addCalendarDays(dateKey, -daysSinceMonday);
};

/** 今週の月曜日以前（または日付未設定）かどうかを判定する */
export const isOverdue = (dueDateStr: string | null): boolean => {
  if (!dueDateStr) return true;
  const taskDate = getCalendarDateKey(dueDateStr);
  const thisMonday = getThisWeekMondayDateKey();
  return taskDate !== null && taskDate < thisMonday;
};

/** 今日より過去の日付かどうかを判定する */
export const isPastDate = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  const date = getCalendarDateKey(dateStr);
  const today = getCalendarDateKey(new Date());
  return date !== null && today !== null && date < today;
};

export const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatDate = (
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  separator: Separator = 'slash',
): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';

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
