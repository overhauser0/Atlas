import { Kysely, PostgresDialect, Generated, JSONColumnType } from "kysely";
import { Pool } from "pg";
import { Task } from "../schemas/task.schema";
import { PushNotification } from "../schemas/push.schema";

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
  due_date: Date | null;
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
export const archiveNotification = async (data: PushNotification) => {
  return await db
    .insertInto("notifications")
    .values({
      title: data.title,
      content: data.content,
      category: data.category,
      priority: data.priority,
      metadata: JSON.stringify(data.metadata || {}),
    })
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
    title: task.title,
    content: task.content,
    status: task.status,
    priority: task.priority,
    area: task.area,
    type: task.type,
    topics: task.topics,
    flags: task.flags,
    due_date: task.dueDate ? new Date(task.dueDate) : null,
    last_edited_time: lastEditedTime,
    raw_data: JSON.stringify(rawData),
  };

  return await db
    .insertInto("notion_tasks_cache")
    .values(values)
    .onConflict((oc) => oc.column("id").doUpdateSet(values))
    .returningAll()
    .executeTakeFirst();
};

/**
 * キャッシュされたタスク一覧を取得する
 */
export const fetchCachedTasks = async () => {
  return await db
    .selectFrom("notion_tasks_cache")
    .selectAll()
    .orderBy("last_edited_time", "desc")
    .execute();
};

export const getTasks = async (filters: {
  area?: string;
  type?: string;
  status?: string;
  excludeStatus?: string[];
}) => {
  let query = db.selectFrom("notion_tasks_cache").selectAll();

  // area（Life,Work）で絞り込み
  if (filters.area) {
    query = query.where("area", "=", filters.area);
  }

  // type（Task, Education, Privateなど）で絞り込み
  if (filters.type) {
    query = query.where("type", "=", filters.type);
  }

  // 特定のステータスで絞り込み
  if (filters.status) {
    query = query.where("status", "=", filters.status);
  }

  // 完了・キャンセル済みなどを除外
  if (filters.excludeStatus && filters.excludeStatus.length > 0) {
    query = query.where("status", "not in", filters.excludeStatus);
  }

  // 常に最新の更新順で取得
  return await query.orderBy("last_edited_time", "desc").execute();
};

/**
 * ローカルタスクを保存する
 */
export const insertLocalTask = async (task: Task) => {
  return await db
    .insertInto("local_tasks")
    .values({
      title: task.title,
      content: task.content,
      status: task.status,
      priority: task.priority,
      area: task.area,
      type: task.type,
      topics: task.topics,
      flags: task.flags,
      due_date: task.dueDate ? new Date(task.dueDate) : null,
    })
    .returningAll()
    .executeTakeFirst();
};
