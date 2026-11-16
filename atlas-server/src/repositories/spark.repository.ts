import { db } from '../db/client';
import { NewSparkRow } from '../models/spark.model';

/** 未消化のSparkを記録日時の昇順で取得する。 */
export const getSparks = async (targetDate?: string) => {
  let query = db
    .selectFrom('sparks')
    .selectAll()
    .where('consumed_at', 'is', null);
  if (targetDate) query = query.where('target_date', '=', targetDate);
  return await query.orderBy('recorded_at', 'asc').execute();
};

/** Sparkを作成する。同一のDiscordメッセージは重複登録しない。 */
export const createSpark = async (spark: NewSparkRow) => {
  return await db
    .insertInto('sparks')
    .values(spark)
    .onConflict((oc) => oc.column('discord_message_id').doNothing())
    .returningAll()
    .executeTakeFirst();
};

/** Sparkを消化済みにする。 */
export const consumeSpark = async (id: string, consumedAt: Date) => {
  return await db
    .updateTable('sparks')
    .set({ consumed_at: consumedAt })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

/** 複数のSparkを消化済みにする。 */
export const consumeSparksBulk = async (ids: string[], consumedAt: Date) => {
  return await db
    .updateTable('sparks')
    .set({ consumed_at: consumedAt })
    .where('id', 'in', ids)
    .returningAll()
    .execute();
};

/** Sparkを物理削除する。 */
export const deleteSpark = async (id: string) => {
  const result = await db
    .deleteFrom('sparks')
    .where('id', '=', id)
    .returning('id')
    .executeTakeFirst();
  return result !== undefined;
};
