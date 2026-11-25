export interface SparkItem {
  id: string;
  content: string;
  recorded_at: string;
  target_date: string;
  discord_message_id?: string | null;
  consumed_at?: string | null;
}

export type SparkFilterMode = 'range' | 'all';

/**
 * アイテムの日付範囲とフィルタモードに応じて未消化 Spark を絞り込む。
 * mode === 'all' または startDate 未設定時は全件を返す。
 */
export const filterSparksForItem = (
  sparks: SparkItem[],
  options: {
    startDate?: string | null;
    endDate?: string | null;
    mode: SparkFilterMode;
  },
): SparkItem[] => {
  const startKey = options.startDate?.slice(0, 10) || null;
  if (options.mode === 'all' || !startKey) {
    return sparks;
  }

  const endKeyRaw = options.endDate?.slice(0, 10) || null;
  const rangeEnd = endKeyRaw && endKeyRaw >= startKey ? endKeyRaw : startKey;

  return sparks.filter((spark) => {
    const targetKey = spark.target_date?.slice(0, 10);
    if (!targetKey) return false;
    return targetKey >= startKey && targetKey <= rangeEnd;
  });
};

/**
 * ISO 文字列を Asia/Tokyo 基準の `YYYY-MM-DD HH:mm` へ整形する。
 */
export const formatSparkTimestampForBody = (
  recordedAt?: string | null,
): string | undefined => {
  if (!recordedAt) return undefined;
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) return undefined;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');

  if (!year || !month || !day || !hour || !minute) return undefined;
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

/** `<input type="time">` 向けに `HH:mm` へ正規化する。 */
export const normalizeTimeForInput = (time?: string | null): string => {
  if (!time) return '';
  const match = time.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '';
};

/** API 送信用に `HH:mm:ss` へ正規化する（空なら null）。 */
export const normalizeTimeForApi = (time?: string | null): string | null => {
  if (!time) return null;
  const trimmed = time.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 8);
  return null;
};

/** 範囲表示用の短い日付ラベル（例: 11/24 または 11/20〜11/22）を生成する。 */
export const formatDateRangeChipLabel = (
  startDate?: string | null,
  endDate?: string | null,
): string => {
  const startKey = startDate?.slice(0, 10);
  if (!startKey) return '';
  const fmt = (key: string) => {
    const [, m, d] = key.split('-');
    return m && d ? `${Number(m)}/${Number(d)}` : key;
  };
  const endKey = endDate?.slice(0, 10);
  if (endKey && endKey > startKey) {
    return `${fmt(startKey)}〜${fmt(endKey)}`;
  }
  return fmt(startKey);
};
