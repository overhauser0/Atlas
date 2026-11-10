type Separator = 'slash' | 'hyphen' | 'none';

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
