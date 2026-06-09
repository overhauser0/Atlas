import { Kysely, PostgresDialect, Generated, JSONColumnType } from 'kysely';
import { Pool } from 'pg';
import { DbPiece } from '../schemas/piece.schema';
import { PushNotificationInput } from '../schemas/push.schema';

// ==========================================
// 1. テーブル定義 (Interfaces)
// ==========================================

export interface LocalPiecesTable {
  id: Generated<string>; // 👈 DBが作るからGenerated
  title: string;
  note: string;
  status: string; // 👈 Zodが必ず 'INBOX' などを入れるからGenerated不要
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  fkw: string[];
  prefs: string[];
  url: string | null;
  date: string | null;
  created_at: Generated<Date>; // 👈 DBが作るからGenerated
}

export interface NotionPiecesCacheTable {
  id: string; // 👈 NotionのIDをアプリが指定して入れるからGenerated不要
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
  synced_at: Generated<Date>; // 👈 DBが作るからGenerated
  raw_data: JSONColumnType<any>;
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

// ==========================================
// 2. 接続設定
// ==========================================

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<Database>({ dialect });

// ==========================================
// 3. データ操作 (Repository Functions)
// ==========================================

// ------------------------------------------
// Pieces (Notion & Local 統合)
// ------------------------------------------

/**
 * [Read] フィルタ条件に合致するPiece一覧を取得する (Notion + Local結合)
 * @param filters フィルタ条件
 * @returns 日付順にソートされたPieceの配列
 */
export const getPieces = async (filters: {
  area?: string;
  type?: string;
  status?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
  beforeDate?: string;
  afterDate?: string;
}) => {
  // 共通のフィルタを適用するヘルパー
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
    if (filters.beforeDate) {
      q = q.where('date', '<', filters.beforeDate);
    }
    if (filters.afterDate) {
      q = q.where('date', '>', filters.afterDate);
    }
    return q;
  };

  // 1. Notionキャッシュから取得
  const notionPieces = await applyCommonFilters(
    db.selectFrom('notion_pieces_cache').selectAll(),
  ).execute();

  // 2. ローカルタスクから取得
  const localPieces = await applyCommonFilters(
    db.selectFrom('local_pieces').selectAll(),
  ).execute();

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
 * [Read] IDからタスクを取得し、Sourceを特定する
 * @param id タスクID
 */
export const getPieceById = async (id: string) => {
  // まずローカルを検索
  const local = await db
    .selectFrom('local_pieces')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (local) return { ...local, source: 'LOCAL' };

  // なければNotionキャッシュを検索
  const notion = await db
    .selectFrom('notion_pieces_cache')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (notion) return { ...notion, source: 'NOTION' };

  return null;
};

// ------------------------------------------
// Notion Pieces Cache
// ------------------------------------------

/**
 * [Upsert] Notionのデータをキャッシュテーブルに保存・更新する
 * @param piece NotionのPieceデータ
 * @param lastEditedTime 最終更新日時
 * @param rawData Notion APIの生レスポンス
 */
export const upsertNotionPieceCache = async (
  piece: DbPiece,
  lastEditedTime: Date,
  rawData: any,
) => {
  const values = {
    ...piece,
    last_edited_time: lastEditedTime,
    raw_data: JSON.stringify(rawData),
  };

  const upsertedPiece = await db
    .insertInto('notion_pieces_cache')
    .values(values as any)
    .onConflict((oc) => oc.column('id').doUpdateSet(values as any))
    .returningAll()
    .executeTakeFirst();

  if (upsertedPiece) (upsertedPiece as any).source = 'NOTION';

  return upsertedPiece;
};

/**
 * [Update] ユーザー操作によるNotionキャッシュの部分更新
 * @param id Notion Page ID
 * @param updates 更新内容
 */
export const updateNotionPieceCache = async (
  id: string,
  updates: Partial<DbPiece>,
) => {
  const dbUpdates = {
    ...updates,
    last_edited_time: new Date(), // タイムスタンプだけ強制セット
  };

  const updatedPiece = await db
    .updateTable('notion_pieces_cache')
    .set(dbUpdates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedPiece) (updatedPiece as any).source = 'NOTION';

  return updatedPiece;
};

/**
 * [Delete] Notionの最新リストに含まれないキャッシュデータを削除する
 * @param activeIds 現在Notionに存在するアクティブなPage IDの配列
 */
export const deleteStaleNotionCache = async (activeIds: string[]) => {
  if (activeIds.length === 0) return;
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', 'not in', activeIds)
    .execute();
};

/**
 * [Delete] Notionキャッシュを削除する
 * @param id Notion Page ID
 */
export const deleteNotionPieceCache = async (id: string) => {
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', '=', id)
    .executeTakeFirst();
};

// ------------------------------------------
// Local Pieces
// ------------------------------------------

/**
 * [Create] ローカルタスクを保存する
 * @param piece ローカルのPieceデータ
 */
export const insertLocalPiece = async (dbPiece: DbPiece) => {
  const insertedPiece = await db
    .insertInto('local_pieces')
    .values(dbPiece as any)
    .returningAll()
    .executeTakeFirst();

  if (insertedPiece) (insertedPiece as any).source = 'LOCAL';

  return insertedPiece;
};

/**
 * [Update] ローカルPieceを部分更新する
 * @param id ローカルタスクID
 * @param updates 更新内容
 */
export const updateLocalPiece = async (
  id: string,
  updates: Partial<DbPiece>,
) => {
  const updatedPiece = await db
    .updateTable('local_pieces')
    .set(updates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedPiece) (updatedPiece as any).source = 'LOCAL';

  return updatedPiece;
};

/**
 * [Delete] ローカルタスクを削除する
 * @param id ローカルタスクID
 */
export const deleteLocalPiece = async (id: string) => {
  return await db
    .deleteFrom('local_pieces')
    .where('id', '=', id)
    .executeTakeFirst();
};

/**
 * [Delete] 60日以上前に「Done」になったローカルタスクを物理削除する ※停止中
 */
export const deleteOldDoneLocalPieces = async () => {
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

  return await db
    .deleteFrom('local_pieces')
    .where('status', '=', 'Done')
    .where('date', 'is not', null)
    .where('date', '<', thresholdDateStr)
    .execute();
};

// ------------------------------------------
// Notifications
// ------------------------------------------

/**
 * [Create] 外部からの通知イベントを保存する
 * @param data プッシュ通知データ
 */
export const insertNotification = async (data: PushNotificationInput) => {
  return await db
    .insertInto('notifications')
    .values({
      title: data.title,
      note: data.note || '',
      category: data.category || 'INFO',
      metadata: JSON.stringify(data.metadata || {}),
      is_read: false,
    })
    .returningAll()
    .executeTakeFirst();
};

/**
 * [Read] 通知履歴を取得する
 * @param limit 取得件数 (デフォルト: 50)
 */
export const getNotifications = async (limit = 50) => {
  return await db
    .selectFrom('notifications')
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(limit)
    .execute();
};

/**
 * [Update] 特定の通知を既読にする
 * @param id 通知ID
 */
export const markNotificationAsRead = async (id: string) => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

/**
 * [Update] 未読の通知をすべて既読にする
 */
export const markAllNotificationsAsRead = async () => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('is_read', '=', false)
    .execute();
};

// ------------------------------------------
// App Metadata (Sync Info)
// ------------------------------------------

/**
 * [Read] 最終同期時刻を取得する
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
 * [Upsert] 最終同期時刻を更新する
 * @param nowISO 現在時刻のISO文字列
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
