import { Kysely, PostgresDialect, Generated } from "kysely";
import { Pool } from "pg";

// local_tasksテーブルの「型」を定義
export interface LocalTaskTable {
  id: Generated<string>;
  title: string;
  _Tyoe_status: string;
  due_date: Date | null;
  created_at: Generated<Date>;
}

export interface NotionTaskTable {
  id: string;
  title: string;
  status: string;
  area: string | null;
  type: string | null;
  topics: string[] | null;
  flags: string[] | null;
  due_date: Date | null;
  last_edited_time: Date;
  synced_at: Generated<Date>;
  raw_data: any;
}

// データベース全体の型
export interface Database {
  local_tasks: LocalTaskTable;
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

// どこからでも呼び出せる db インスタンス
export const db = new Kysely<Database>({ dialect });
