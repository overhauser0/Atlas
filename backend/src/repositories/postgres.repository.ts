import { Kysely, PostgresDialect, Generated, JSONColumnType } from 'kysely';
import { Pool } from 'pg';
import { Task } from '../schemas/task.schema';
import { PushNotificationInput } from '../schemas/push.schema';

// --- 1. テーブル定義 (Interfaces) ---

export interface LocalTasksTable {
  id: Generated<string>;
  title: string;
  content: string;
  status: string;
  priority: number;
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  url: string | null;
  due_date: string | null;
  created_at: Generated<Date>;
}

export interface NotionTasksCacheTable {
  id: string; // Notion Page ID (UUID)
  title: string;
  content: string;
  status: string;
  priority: number;
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  due_date: Date | null;
  url: string | null;
  last_edited_time: Date;
  synced_at: Generated<Date>;
  raw_data: JSONColumnType<any>; // Notion APIからの生のレスポンス
}

export interface NotificationsTable {
  id: Generated<string>;
  title: string;
  content: string;
  category: string;
  priority: number;
  metadata: JSONColumnType<any>;
  created_at: Generated<Date>;
  is_read: boolean;
}

export interface Database {
  local_tasks: LocalTasksTable;
  notion_tasks_cache: NotionTasksCacheTable;
  notifications: NotificationsTable;
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
      content: data.content,
      category: data.category,
      priority: data.priority,
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
export const upsertNotionTaskCache = async (
  task: Task,
  lastEditedTime: Date,
  rawData: any,
) => {
  const values = {
    id: task.id!,
    title: task.title || 'No Title',
    content: task.content || 'No Content',
    status: task.status || 'INBOX',
    priority: task.priority || 3,
    area: task.area || 'Work',
    type: task.type || 'Task',
    topics: task.topics || [],
    flags: task.flags || [],
    due_date: task.dueDate || null,
    url: task.url || null,
    fkw: task.fkw || [],
    last_edited_time: lastEditedTime,
    raw_data: JSON.stringify(rawData),
  };

  const upsertedTask = await db
    .insertInto('notion_tasks_cache')
    .values(values)
    .onConflict((oc) => oc.column('id').doUpdateSet(values))
    .returningAll()
    .executeTakeFirst();

  if (upsertedTask) (upsertedTask as any).source = 'NOTION';

  return upsertedTask;
};

/**
 * ユーザー操作による部分更新 (Notionキャッシュ)
 * upsertと違い、変更があったフィールドのみを更新する
 */
export const updateNotionTaskCache = async (
  id: string,
  updates: Partial<Task>,
) => {
  const updatedTask = await db
    .updateTable('notion_tasks_cache')
    .set({
      title: updates.title,
      status: updates.status,
      priority: updates.priority,
      area: updates.area,
      type: updates.type,
      topics: updates.topics,
      flags: updates.flags,
      url: updates.url,
      due_date: updates.dueDate ? new Date(updates.dueDate) : null,
      last_edited_time: new Date(), // 最終編集時刻のみ更新
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedTask) (updatedTask as any).source = 'NOTION'; // 返却するオブジェクトに source を追加

  return updatedTask;
};

/**
 * キャッシュされたタスク一覧を取得する
 */
export const fetchCachedTasks = async () => {
  return await db
    .selectFrom('notion_tasks_cache')
    .selectAll()
    .orderBy('last_edited_time', 'desc')
    .execute();
};

export const getTasks = async (filters: {
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
  const notionTasks = await applyCommonFilters(
    db.selectFrom('notion_tasks_cache').selectAll(),
  )
    //.orderBy('last_edited_time', 'desc')
    .execute();

  // 2. ローカルタスクから取得
  const localTasks = await applyCommonFilters(
    db.selectFrom('local_tasks').selectAll(),
  )
    //.orderBy('created_at', 'desc')
    .execute();

  const mapTask = (t: any, source: 'NOTION' | 'LOCAL') => ({
    ...t,
    source,
    dueDate: t.due_date, // snake_case を camelCase にマッピング
  });

  // 3. 結合して source を付与
  const combined = [
    ...notionTasks.map((t) => mapTask(t, 'NOTION')),
    ...localTasks.map((t) => mapTask(t, 'LOCAL')),
  ];

  // 4. 全体を日付順でソート（Notionは最終編集、Localは作成日時で代用）
  return combined.sort((a, b) => {
    const dateA = new Date(
      (a as any).last_edited_time || (a as any).created_at,
    ).getTime();
    const dateB = new Date(
      (b as any).last_edited_time || (b as any).created_at,
    ).getTime();
    return dateB - dateA;
  });
};

/**
 * ローカルタスクを保存する
 */
export const insertLocalTask = async (task: Task) => {
  const insertedTask = await db
    .insertInto('local_tasks')
    .values({
      title: task.title,
      content: task.content,
      status: task.status || 'INBOX',
      priority: task.priority || 3,
      area: task.area || 'Work',
      type: task.type || 'Task',
      topics: task.topics || [],
      flags: task.flags || [],
      due_date: task.dueDate || null,
      url: task.url || null,
    })
    .returningAll()
    .executeTakeFirst();

  if (insertedTask) (insertedTask as any).source = 'LOCAL';

  return insertedTask;
};

/**
 * ローカルタスクを更新する
 */
export const updateLocalTask = async (id: string, updates: Partial<Task>) => {
  const { dueDate, ...rest } = updates;
  const updatesForDb: any = { ...rest };
  if (dueDate !== undefined) updatesForDb.due_date = dueDate;

  const updatedTask = await db
    .updateTable('local_tasks')
    .set(updatesForDb)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedTask) (updatedTask as any).source = 'LOCAL';

  (updatedTask as any).dueDate = updatedTask?.due_date;
  delete (updatedTask as any).due_date;

  return updatedTask;
};

/**
 * 60日以上前に「Done」になったローカルタスクをDBから物理削除する
 */
export const cleanupOldDoneLocalTasks = async () => {
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
    .deleteFrom('local_tasks')
    .where('status', '=', 'Done')
    .where('due_date', 'is not', null)
    .where('due_date', '<', thresholdDateStr)
    .execute();
};

/**
 * Notionの最新リストに含まれないキャッシュデータを削除する
 */
export const deleteStaleNotionCache = async (activeIds: string[]) => {
  if (activeIds.length === 0) return; // 空配列でin句を使うとエラーになる対策
  return await db
    .deleteFrom('notion_tasks_cache')
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
