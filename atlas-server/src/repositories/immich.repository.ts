// atlas-server/src/repositories/immich.repository.ts

import { db } from '../db/client';
import { ImmichStatsData } from '../models/immich.model';

/** Immichのキャッシュを取得する。 */
export const getImmichCacheFromDb = async (key: string = 'stats') => {
  const result = await db
    .selectFrom('immich_cache')
    .select(['data', 'updated_at'])
    .where('key', '=', key)
    .executeTakeFirst();

  return result || null;
};

/** Immichの統計キャッシュを追加または更新する。 */
export const upsertImmichCacheToDb = async (
  key: string = 'stats',
  data: ImmichStatsData,
) => {
  await db
    .insertInto('immich_cache')
    .values({
      key,
      data: JSON.stringify(data),
      updated_at: new Date(),
    })
    .onConflict((oc) =>
      oc.column('key').doUpdateSet({
        data: JSON.stringify(data),
        updated_at: new Date(),
      }),
    )
    .execute();
};
