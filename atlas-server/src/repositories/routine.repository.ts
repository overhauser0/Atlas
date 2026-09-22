import { db } from '../db/client'; // Kyselyインスタンス
import {
  NewRoutineTask,
  RoutineTask,
  UpdateRoutineTask,
} from '../models/routine.model';

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

export const createRoutine = async (
  data: NewRoutineTask,
): Promise<RoutineTask> => {
  return await db
    .insertInto('routine_tasks')
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const deleteRoutine = async (id: number): Promise<boolean> => {
  const result = await db
    .deleteFrom('routine_tasks')
    .where('id', '=', id)
    .executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
};

export const updateRoutine = async (id: number, data: UpdateRoutineTask) => {
  return await db
    .updateTable('routine_tasks')
    .set({
      ...data,
      updated_at: new Date(), // 更新日時を現在時刻で上書き
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst(); // 更新後の1行を返す
};
