import { db } from '../db/client';

export const getLastSyncTimeByKey = async (key: string): Promise<string> => {
  const record = await db
    .selectFrom('app_metadata')
    .select('value')
    .where('key', '=', key)
    .executeTakeFirst();

  return record?.value || '1970-01-01T00:00:00Z';
};

export const updateSyncTimeByKey = async (key: string, nowISO: string) => {
  await db
    .insertInto('app_metadata')
    .values({
      key,
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

// 互換性のためのラッパー関数
export const getLastNotionSyncTime = () =>
  getLastSyncTimeByKey('last_notion_sync_time');
export const updateLastNotionSyncTime = (nowISO: string) =>
  updateSyncTimeByKey('last_notion_sync_time', nowISO);
export const getLastDiarySyncTime = () =>
  getLastSyncTimeByKey('last_diary_sync_time');
export const updateLastDiarySyncTime = (nowISO: string) =>
  updateSyncTimeByKey('last_diary_sync_time', nowISO);
