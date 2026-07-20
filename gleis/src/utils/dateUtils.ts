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

export const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * 日付を YYYY-MM-DD 形式で返す
 */
export const getDateString = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
    .format(date)
    .replace(/\//g, '-');
};

type Separator = 'slash' | 'hyphen' | 'none';

export const getDateFullString = (
  date: Date | string | null | undefined,
  separator: Separator = 'slash',
): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '';
    }

    const baseDateString = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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
  } catch (error) {
    return '';
  }
};

export const getDateShortString = (
  date: Date | string | null | undefined,
  separator: Separator = 'slash',
): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '';
    }

    const baseDateString = new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
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
  } catch (error) {
    return '';
  }
};
