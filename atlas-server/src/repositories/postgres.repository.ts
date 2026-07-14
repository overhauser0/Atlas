import { Kysely, PostgresDialect, Generated, JSONColumnType } from 'kysely';
import { Pool } from 'pg';
import { DbPiece } from '../schemas/piece.schema';
import { DbDiary } from '../schemas/diary.schema';
import { PushNotificationInput } from '../schemas/push.schema';
import { DiaryTable } from '../schemas/diary.schema';
import { DbGoogleEvent } from '../schemas/calendar.schema';

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
}

export interface NotificationsTable {
  id: Generated<string>;
  title: string;
  note: string;
  url: string;
  category: string;
  metadata: JSONColumnType<any>;
  created_at: Generated<Date>;
  is_read: Generated<boolean>;
}

export interface LocalNotesTable {
  id: Generated<string>;
  title: string;
  content: string;
  url: string;
  is_pinned: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
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
  diaries: DiaryTable;
  google_events: DbGoogleEvent;
  local_notes: LocalNotesTable;
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
      url: data.url || '',
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

// ------------------------------------------
// Diaries
// ------------------------------------------

/**
 * [Read] 保存されているすべての日記を取得する
 * @returns 日付降順でソートされた日記の配列
 */
export const getDiaries = async () => {
  return await db
    .selectFrom('diaries')
    .selectAll()
    .orderBy('date', 'desc')
    .execute();
};

/**
 * [Upsert] Notionから取得した日記データをDBに保存・更新する
 * @param diary NotionのPieceデータ
 * @param last_edited_time 最終更新日時
 */
export const upsertDiary = async (diary: DbDiary, last_edited_time: Date) => {
  const values = {
    ...diary,
    last_edited_time,
  };

  const upsertedDiary = await db
    .insertInto('diaries')
    .values(values as any)
    .onConflict((oc) => oc.column('id').doUpdateSet(values as any))
    .returningAll()
    .executeTakeFirst();

  return upsertedDiary;
};

/**
 * [Update] ユーザー操作によるDiaryキャッシュの部分更新
 * @param id Notion Page ID
 * @param updates 更新内容
 */
export const updateDiary = async (id: string, updates: Partial<DbPiece>) => {
  const dbUpdates = {
    ...updates,
    last_edited_time: new Date(), // タイムスタンプだけ強制セット
  };

  const updatedDiary = await db
    .updateTable('diaries')
    .set(dbUpdates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return updatedDiary;
};

/**
 * [Read] 日記の最終同期時刻を取得する
 */
export const getLastDiarySyncTime = async (): Promise<string> => {
  const record = await db
    .selectFrom('app_metadata')
    .select('value')
    .where('key', '=', 'last_diary_sync_time')
    .executeTakeFirst();

  return record?.value || '1970-01-01T00:00:00Z';
};

/**
 * [Upsert] 日記の最終同期時刻を更新する
 * @param nowISO 現在時刻のISO文字列
 */
export const updateLastDiarySyncTime = async (nowISO: string) => {
  await db
    .insertInto('app_metadata')
    .values({
      key: 'last_diary_sync_time',
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

// ------------------------------------------
// Google Calendar Events
// ------------------------------------------

/**
 * [Upsert] n8nから受信したGoogleカレンダーのイベントをDBに保存・更新する
 * @param events n8nから送られてくるイベントの配列
 */
export const upsertGoogleEvents = async (events: any[]) => {
  if (!events || events.length === 0) return;

  const values = events.map((event) => ({
    id: event.id,
    title: event.title,
    note: event.note || '',
    date: event.date,
    url: event.url || '',
    synced_at: new Date(),
  }));

  await db
    .insertInto('google_events')
    .values(values as any)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        title: eb.ref('excluded.title'),
        note: eb.ref('excluded.note'),
        date: eb.ref('excluded.date'),
        url: eb.ref('excluded.url'),
        synced_at: eb.ref('excluded.synced_at'),
      })),
    )
    .execute();
};

/**
 * [Read] 保存されているGoogleカレンダーのイベントを取得する
 */
export const getGoogleEvents = async () => {
  return await db
    .selectFrom('google_events')
    .selectAll()
    .orderBy('date', 'asc')
    .execute();
};

// 追加と削除を両方やる

export const syncGoogleEvents = async (events: any[]) => {
  if (!events || events.length === 0) {
    // 予定が0件の場合は全削除（または何もしない等、要件に合わせて調整）
    return;
  }

  // 1. 追加・更新 (Upsert) 処理
  const values = events.map((event) => ({
    id: event.id,
    title: event.title,
    note: event.note || '',
    date: event.date,
    url: event.url || '',
    synced_at: new Date(),
  }));

  await db
    .insertInto('google_events')
    .values(values as any)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        title: eb.ref('excluded.title'),
        note: eb.ref('excluded.note'),
        date: eb.ref('excluded.date'),
        url: eb.ref('excluded.url'),
        synced_at: eb.ref('excluded.synced_at'),
      })),
    )
    .execute();

  // 2. 削除 (Delete) 処理を追加
  // n8nから送られてきた「現在アクティブなID」のリストを作成
  const activeIds = events.map((e) => e.id);

  // DBにあって、n8nから送られてきたリストにないIDの予定を削除する
  if (activeIds.length > 0) {
    await db
      .deleteFrom('google_events')
      .where('id', 'not in', activeIds)
      .execute();
  }
};

// ------------------------------------------
// Local Notes (メモの仮置き場)
// ------------------------------------------

/**
 * [Read] ノート一覧を取得 (ピン留め順 ＞ 更新日順)
 */
export const getLocalNotes = async () => {
  return await db
    .selectFrom('local_notes')
    .selectAll()
    .orderBy('is_pinned', 'desc')
    .orderBy('updated_at', 'desc')
    .execute();
};

/**
 * [Create] 新規ノートを作成
 */
export const createLocalNote = async (data: {
  title: string;
  content?: string;
  url?: string;
}) => {
  return await db
    .insertInto('local_notes')
    .values({
      title: data.title,
      content: data.content || '',
      url: data.url || '',
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};

/**
 * [Update] ノートを更新 (Debounce保存用)
 */
export const updateLocalNote = async (
  id: string,
  data: Partial<{
    title: string;
    content: string;
    url: string;
    is_pinned: boolean;
  }>,
) => {
  return await db
    .updateTable('local_notes')
    .set({
      ...data,
      updated_at: new Date(), // 更新日時を現在時刻にセット
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
};

/**
 * [Delete] ノートを削除 (Notion昇格完了時など)
 */
export const deleteLocalNote = async (id: string) => {
  return await db
    .deleteFrom('local_notes')
    .where('id', '=', id)
    .returning('id')
    .executeTakeFirstOrThrow();
};
