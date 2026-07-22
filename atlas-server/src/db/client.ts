// atlas-server/src/db/client.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './types';

// コネクションプールの設定
const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

// アプリケーション全体で共有するKyselyインスタンス
export const db = new Kysely<Database>({ dialect });
