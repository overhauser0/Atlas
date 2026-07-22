import { db } from '../db/client';

export const getDiaries = async () => {
  return await db
    .selectFrom('diaries')
    .selectAll()
    .orderBy('date', 'desc')
    .execute();
};

export const upsertDiary = async (diary: any, last_edited_time: Date) => {
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

export const updateDiary = async (id: string, updates: any) => {
  const dbUpdates = {
    ...updates,
    last_edited_time: new Date(),
  };

  const updatedDiary = await db
    .updateTable('diaries')
    .set(dbUpdates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return updatedDiary;
};
