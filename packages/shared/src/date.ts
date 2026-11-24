export type DateSeparator = 'slash' | 'hyphen' | 'none';

export const JA_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

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

/** YYYY-MM-DD 文字列をタイムゾーンズレなくローカルの Date に変換する */
export const toLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Date をローカル日付の YYYY-MM-DD キーに変換する */
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Date に日数を加算した新しい Date を返す */
export const addDays = (date: Date, count: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
};

/** YYYY-MM-DD 文字列に日数を加減算する（タイムゾーンズレ防止） */
export const shiftDateKey = (dateStr: string, days: number): string => {
  const parsed = toLocalDate(dateStr);
  if (!parsed) return dateStr;
  return toDateKey(addDays(parsed, days));
};

/** YYYY-MM-DD 文字列から年（数値）を抽出する */
export const getYearFromDate = (
  dateStr: string | null | undefined,
): number | null => {
  if (!dateStr || dateStr.length < 4) return null;
  const parsed = Number(dateStr.slice(0, 4));
  return Number.isInteger(parsed) && parsed > 1900 ? parsed : null;
};

/** YYYY-MM-DD 文字列から月インデックス（0〜11）を抽出する */
export const getMonthIndexFromDate = (
  dateStr: string | null | undefined,
): number | null => {
  if (!dateStr || dateStr.length < 7) return null;
  const parsed = Number(dateStr.slice(5, 7));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed - 1
    : null;
};

/** YYYY-MM-DD を日本語の曜日付き文字列に整形する（例: 2026年11月22日 (日) / 11/22 (日)） */
export const formatJaDateWithWeekday = (
  dateStr: string,
  style: 'long' | 'short' = 'long',
): string => {
  const parsed = toLocalDate(dateStr);
  if (!parsed) return dateStr;
  const weekday = JA_WEEKDAYS[parsed.getDay()];
  if (style === 'short') {
    return `${parsed.getMonth() + 1}/${parsed.getDate()} (${weekday})`;
  }
  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日 (${weekday})`;
};

/** ISO 日時文字列から HH:mm を抽出する */
export const formatTimeFromIso = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatDateJst = (
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  separator: DateSeparator = 'slash',
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
  separator: DateSeparator = 'slash',
): string =>
  formatDateJst(
    date,
    { year: 'numeric', month: '2-digit', day: '2-digit' },
    separator,
  );

export const getDateShortString = (
  date: Date | string | null | undefined,
  separator: DateSeparator = 'slash',
): string =>
  formatDateJst(date, { month: '2-digit', day: '2-digit' }, separator);
