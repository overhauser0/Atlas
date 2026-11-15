// atlas-server/src/repositories/diary.repository.ts

import { db } from '../db/client';
import { DiaryUpdateRow, NewDiaryRow } from '../models/diary.model';

/** 日記を日付の降順で取得する。 */
export const getDiaries = async () => {
  return await db
    .selectFrom('diaries_new')
    .selectAll()
    .orderBy('date', 'desc')
    .execute();
};

/** 日記を作成する。 */
export const createDiary = async (diary: NewDiaryRow) => {
  return await db
    .insertInto('diaries_new')
    .values(diary)
    .onConflict((oc) => oc.column('date').doNothing())
    .returningAll()
    .executeTakeFirst();
};

/** 日記を更新する。 */
export const updateDiary = async (id: string, updates: DiaryUpdateRow) => {
  return await db
    .updateTable('diaries_new')
    .set({
      ...updates,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};
