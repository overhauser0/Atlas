// atlas-server/src/repositories/routine.repository.ts

import { db } from '../db/client';
import {
  NewRoutineTask,
  RoutineTask,
  UpdateRoutineTask,
} from '../models/routine.model';

/** 条件に一致するルーチンを取得する。 */
export const getAllRoutines = async (
  frequency?: string,
  is_active?: boolean,
): Promise<RoutineTask[]> => {
  let query = db.selectFrom('routine_tasks').selectAll();
  if (frequency === 'weekly' || frequency === 'monthly') {
    query = query.where('frequency', '=', frequency);
  }
  if (is_active != undefined) query = query.where('is_active', '=', is_active);
  return await query.orderBy('id', 'asc').execute();
};

/** ルーチンを作成する。 */
export const createRoutine = async (
  data: NewRoutineTask,
): Promise<RoutineTask> => {
  return await db
    .insertInto('routine_tasks')
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
};

/** ルーチンを更新する。 */
export const updateRoutine = async (id: number, data: UpdateRoutineTask) => {
  return await db
    .updateTable('routine_tasks')
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

/** ルーチンを削除し、削除できたかを返す。 */
export const deleteRoutine = async (id: number): Promise<boolean> => {
  const result = await db
    .deleteFrom('routine_tasks')
    .where('id', '=', id)
    .executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
};
