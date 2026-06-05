import { Kysely, PostgresDialect, Generated, JSONColumnType } from 'kysely';
import { Pool } from 'pg';
import { Piece } from '../schemas/piece.schema';
import { PushNotificationInput } from '../schemas/push.schema';

// --- 1. テーブル定義 (Interfaces) ---

export interface LocalPiecesTable {
  id: Generated<string>;
  title: string;
  note: string;
  status: string;
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  url: string | null;
  date: string | null;
  created_at: Generated<Date>;
}

export interface NotionPiecesCacheTable {
  id: string; // Notion Page ID (UUID)
  title: string;
  note: string;
  status: string;
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  fkw: string[];
  prefs: string[];
  date: Date | null;
  url: string | null;
  last_edited_time: Date;
  synced_at: Generated<Date>;
  raw_data: JSONColumnType<any>; // Notion APIからの生のレスポンス
}

export interface NotificationsTable {
  id: Generated<string>;
  title: string;
  note: string;
  category: string;
  metadata: JSONColumnType<any>;
  created_at: Generated<Date>;
  is_read: Generated<boolean>;
}
export interface AppMetadataTable {
  key: string;
  value: string;
  updated_at: Generated<Date>;
}

export interface Database {
  local_pieces: LocalPiecesTable;
  notion_pieces_cache: NotionPiecesCacheTable;
  notifications: NotificationsTable;
  app_metadata: AppMetadataTable;
}

// --- 2. 接続設定 (Existing logic) ---

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<Database>({ dialect });

// --- 3. データ操作 (Repository Functions) ---

/**
 * 外部からの通知イベントを保存する
 */
export const archiveNotification = async (data: PushNotificationInput) => {
  return await db
    .insertInto('notifications')
    .values({
      title: data.title,
      note: data.note,
      category: data.category || 'INFO',
      metadata: JSON.stringify(data.metadata || {}),
      is_read: false,
    })
    .returningAll()
    .executeTakeFirst();
};

/**
 * 通知履歴を取得する
 */
export const getNotifications = async (limit = 50) => {
  return await db
    .selectFrom('notifications')
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(limit)
    .execute();
};

export const markAllAsRead = async () => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('is_read', '=', false)
    .execute();
};
/**
 * 特定の通知を既読にする
 */
export const markAsRead = async (id: string) => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

/**
 * Notionのデータをキャッシュテーブルに保存・更新する (Upsert)
 */
export const upsertNotionPieceCache = async (
  piece: Piece,
  lastEditedTime: Date,
  rawData: any,
) => {
  const values: any = {
    id: piece.id!,
    title: piece.title || 'No Title',
    note: piece.note || '',
    status: piece.status || 'INBOX',
    area: piece.area || 'Work',
    type: piece.type || 'Task',
    topics: piece.topics || [],
    flags: piece.flags || [],
    date: piece.date || null,
    url: piece.url || null,
    fkw: piece.fkw || [],
    prefs: piece.prefs || [],
    last_edited_time: lastEditedTime,
    raw_data: JSON.stringify(rawData),
  };

  const upsertedPiece = await db
    .insertInto('notion_pieces_cache')
    .values(values)
    .onConflict((oc) => oc.column('id').doUpdateSet(values))
    .returningAll()
    .executeTakeFirst();

  if (upsertedPiece) (upsertedPiece as any).source = 'NOTION';

  return upsertedPiece;
};

/**
 * ユーザー操作による部分更新 (Notionキャッシュ)
 * upsertと違い、変更があったフィールドのみを更新する
 */
export const updateNotionPieceCache = async (
  id: string,
  updates: Partial<Piece>,
) => {
  const updatedPiece = await db
    .updateTable('notion_pieces_cache')
    .set({
      title: updates.title,
      status: updates.status,
      area: updates.area,
      type: updates.type,
      topics: updates.topics,
      flags: updates.flags,
      url: updates.url,
      note: updates.note,
      fkw: updates.fkw,
      prefs: updates.prefs,
      date: updates.date ? new Date(updates.date) : null,
      last_edited_time: new Date(), // 最終編集時刻のみ更新
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedPiece) (updatedPiece as any).source = 'NOTION'; // 返却するオブジェクトに source を追加

  return updatedPiece;
};

/**
 * キャッシュされたピース一覧を取得する
 */
export const fetchCachedPieces = async () => {
  return await db
    .selectFrom('notion_pieces_cache')
    .selectAll()
    .orderBy('last_edited_time', 'desc')
    .execute();
};

export const getPieces = async (filters: {
  area?: string;
  type?: string;
  status?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
}) => {
  // 💡 共通のフィルタを適用するヘルパー
  const applyCommonFilters = (qb: any) => {
    let q = qb;
    if (filters.area) q = q.where('area', '=', filters.area);
    if (filters.type) q = q.where('type', '=', filters.type);
    if (filters.status) q = q.where('status', '=', filters.status);
    if (filters.flags && filters.flags.length > 0) {
      q = q.where('flags', 'in', filters.flags);
    }
    if (filters.topics && filters.topics.length > 0) {
      q = q.where('topics', 'in', filters.topics);
    }
    if (filters.excludeStatus && filters.excludeStatus.length > 0) {
      q = q.where('status', 'not in', filters.excludeStatus);
    }
    return q;
  };

  // 1. Notionキャッシュから取得
  const notionPieces = await applyCommonFilters(
    db.selectFrom('notion_pieces_cache').selectAll(),
  )
    //.orderBy('last_edited_time', 'desc')
    .execute();

  // 2. ローカルタスクから取得
  const localPieces = await applyCommonFilters(
    db.selectFrom('local_pieces').selectAll(),
  )
    //.orderBy('created_at', 'desc')
    .execute();

  const mapPiece = (p: any, source: 'NOTION' | 'LOCAL') => ({
    ...p,
    source,
  });

  // 3. 結合して source を付与
  const combined = [
    ...notionPieces.map((p: any) => mapPiece(p, 'NOTION')),
    ...localPieces.map((p: any) => mapPiece(p, 'LOCAL')),
  ];

  const pickDate = (piece: any) => {
    return new Date(
      piece.date || piece.created_at || piece.last_edited_time,
    ).getTime();
  };

  // 4. 全体を日付順でソート
  return combined.sort((a, b) => pickDate(b) - pickDate(a));
};

/**
 * ローカルタスクを保存する
 */
export const insertLocalPiece = async (piece: Piece) => {
  const insertedPiece = await db
    .insertInto('local_pieces')
    .values({
      title: piece.title,
      note: piece.note,
      status: piece.status || 'INBOX',
      area: piece.area || 'Work',
      type: piece.type || 'Task',
      topics: piece.topics || [],
      flags: piece.flags || [],
      date: piece.date || null,
      url: piece.url || null,
    })
    .returningAll()
    .executeTakeFirst();

  if (insertedPiece) (insertedPiece as any).source = 'LOCAL';

  return insertedPiece;
};

/**
 * ローカルPieceを更新する
 */
export const updateLocalPiece = async (id: string, updates: Partial<Piece>) => {
  const updatedPiece = await db
    .updateTable('local_pieces')
    .set(updates)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedPiece) (updatedPiece as any).source = 'LOCAL';

  return updatedPiece;
};

/**
 * 60日以上前に「Done」になったローカルタスクをDBから物理削除する
 */
export const cleanupOldDoneLocalPieces = async () => {
  // 現在から60日前の日時を計算
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - 60);

  const thresholdDateStr = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
    .format(thresholdDate)
    .replace(/\//g, '-');

  // ステータスが 'Done' かつ、更新日時が60日より前のものを削除
  return await db
    .deleteFrom('local_pieces')
    .where('status', '=', 'Done')
    .where('date', 'is not', null)
    .where('date', '<', thresholdDateStr)
    .execute();
};

/**
 * Notionの最新リストに含まれないキャッシュデータを削除する
 */
export const deleteStaleNotionCache = async (activeIds: string[]) => {
  if (activeIds.length === 0) return; // 空配列でin句を使うとエラーになる対策
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', 'not in', activeIds)
    .execute();
};

/**
 * 最終同期時刻を取得する
 */
export const getLastNotionSyncTime = async (): Promise<string> => {
  const record = await db
    .selectFrom('app_metadata')
    .select('value')
    .where('key', '=', 'last_notion_sync_time')
    .executeTakeFirst();

  return record?.value || '1970-01-01T00:00:00Z';
};

/**
 * 最終同期時刻を更新する (Upsert)
 */
export const updateLastNotionSyncTime = async (nowISO: string) => {
  await db
    .insertInto('app_metadata')
    .values({
      key: 'last_notion_sync_time',
      value: nowISO,
    })
    .onConflict((oc) =>
      oc.column('key').doUpdateSet({
        value: nowISO,
        updated_at: new Date(),
      }),
    )
    .execute();
};
