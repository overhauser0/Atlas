// atlas-server/src/repositories/diary.repository.ts

import { db } from '../db/client';
import { DiaryUpdateRow, NewDiaryRow } from '../models/diary.model';

/** 日記を日付の降順で取得する。 */
export const getDiaries = async (range: {
  startDate?: string;
  endDate?: string;
} = {}) => {
  let query = db
    .selectFrom('diaries')
    .selectAll()
    .orderBy('date', 'desc');

  if (range.startDate) {
    query = query.where('date', '>=', range.startDate);
  }
  if (range.endDate) {
    query = query.where('date', '<=', range.endDate);
  }

  return await query.execute();
};

/** 指定した日付の日記を取得する。 */
export const getDiaryByDate = async (date: string) => {
  return await db
    .selectFrom('diaries')
    .selectAll()
    .where('date', '=', date)
    .executeTakeFirst();
};

/** 日記を作成または上書きする。 */
export const upsertDiary = async (diary: NewDiaryRow) => {
  return await db
    .insertInto('diaries')
    .values(diary)
    .onConflict((oc) =>
      oc.column('date').doUpdateSet({
        rate: diary.rate,
        content: diary.content,
        flag: diary.flag,
        piece_ids: diary.piece_ids,
        updated_at: new Date(),
      }),
    )
    .returningAll()
    .executeTakeFirst();
};

/** 日記を更新する。 */
export const updateDiaryByDate = async (
  date: string,
  updates: DiaryUpdateRow,
) => {
  return await db
    .updateTable('diaries')
    .set({
      ...updates,
      updated_at: new Date(),
    })
    .where('date', '=', date)
    .returningAll()
    .executeTakeFirst();
};
