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

export const getColumnName = (dueDateStr: string | null): string => {
  if (!dueDateStr) return 'Overdue';
  const taskDate = new Date(dueDateStr);
  taskDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + diffToMonday);

  if (taskDate < thisMonday) return 'Overdue';

  const diffDays = Math.round(
    (taskDate.getTime() - thisMonday.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays >= 0 && diffDays <= 6) return WEEK_DAYS[diffDays];
  return 'Future';
};

type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type TargetColumnType = DayOfWeek | 'Overdue';

export const calculateNewDateWithPreservedTime = (
  originalDateStr: string | null,
  targetColumn: TargetColumnType,
): string | null => {
  if (targetColumn === 'Overdue') return null;

  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const targetMonday = new Date(today);
  targetMonday.setDate(today.getDate() + diffToMonday);

  const colIndex = WEEK_DAYS.indexOf(targetColumn as DayOfWeek);
  const targetDate = new Date(targetMonday);
  targetDate.setDate(targetMonday.getDate() + colIndex);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const newDatePart = `${yyyy}-${mm}-${dd}`;

  if (originalDateStr && originalDateStr.includes('T')) {
    const timeMatch = originalDateStr.match(/T(\d{2}:\d{2}:\d{2}(\.\d+)?)/);
    const timePart = timeMatch ? timeMatch[1] : '09:00:00.000';
    return `${newDatePart}T${timePart}+09:00`;
  }
  return newDatePart;
};

export const calculateNewDateWithPreservedTimeForCalendar = (
  originalDateStr: string | null,
  targetDateStr: string,
): string | null => {
  if (!targetDateStr) return null;

  if (originalDateStr && originalDateStr.includes('T')) {
    const timeMatch = originalDateStr.match(/T(\d{2}:\d{2}:\d{2}(\.\d+)?)/);
    const timePart = timeMatch ? timeMatch[1] : '09:00:00.000';
    return `${targetDateStr}T${timePart}+09:00`;
  }
  return targetDateStr;
};
