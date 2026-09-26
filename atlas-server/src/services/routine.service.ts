// atlas-server/src/services/routine.service.ts

import * as routineRepository from '../repositories/routine.repository';
import * as pieceRepository from '../repositories/piece.repository';
import { broadcast } from '../utils/websocket';
import {
  createRoutineSchema,
  updateRoutineSchema,
  RoutineTask,
} from '../models/routine.model';
import { DbPiece } from '../models/piece.model';

/** 条件に一致するルーチンを取得する。 */
export const getRoutines = async (
  frequency?: string,
): Promise<RoutineTask[]> => {
  return await routineRepository.getAllRoutines(frequency);
};

/** 入力を検証してルーチンを作成する。 */
export const createRoutine = async (input: unknown): Promise<RoutineTask> => {
  const validatedData = createRoutineSchema.parse(input);
  return await routineRepository.createRoutine(validatedData);
};

/** 入力を検証してルーチンを更新する。 */
export const updateRoutine = async (id: number, input: unknown) => {
  const validatedData = updateRoutineSchema.parse(input);
  return await routineRepository.updateRoutine(id, validatedData);
};

/** ルーチンを削除する。 */
export const deleteRoutine = async (id: number): Promise<boolean> => {
  return await routineRepository.deleteRoutine(id);
};

/**
 * アクティブなルーチンからタスクを作成する。
 */
export const generateRoutineTasks = async () => {
  const activeRoutines = await routineRepository.getAllRoutines(
    undefined,
    true,
  );

  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const mondayDateNum = thisMonday.getDate();
  const isFourthMonday = mondayDateNum >= 22 && mondayDateNum <= 28;

  let nextMonthYear = thisMonday.getFullYear();
  let nextMonth = thisMonday.getMonth() + 1;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextMonthYear++;
  }

  const piecesToCreate: Partial<DbPiece>[] = [];

  for (const routine of activeRoutines) {
    if (routine.frequency === 'weekly') {
      const targetDayOfWeek = routine.day_of_week ?? 1;
      const offsetFromMonday = targetDayOfWeek === 0 ? 6 : targetDayOfWeek - 1;

      const dueDate = new Date(thisMonday);
      dueDate.setDate(thisMonday.getDate() + offsetFromMonday);

      piecesToCreate.push({
        area: 'Work',
        title: routine.title,
        date: dueDate.toISOString().split('T')[0],
        note: routine.note || '',
        url: routine.url || '',
        status: 'INBOX',
      });
    }
    else if (routine.frequency === 'monthly' && isFourthMonday) {
      let dueDate = new Date(nextMonthYear, nextMonth, 1);

      if (routine.type === 'date') {
        dueDate.setDate(routine.day || 1);
      } else if (routine.type === 'nthWeekday') {
        const targetWeek = routine.week || 1;
        const targetDayOfWeek = routine.day_of_week ?? 1;

        const firstDayOfMonth = dueDate.getDay();
        let offset = targetDayOfWeek - firstDayOfMonth;
        if (offset < 0) offset += 7;

        dueDate.setDate(1 + offset + (targetWeek - 1) * 7);
      }

      piecesToCreate.push({
        area: 'Work',
        title: routine.title,
        date: dueDate.toISOString().split('T')[0],
        note: routine.note || '',
        url: routine.url || '',
        status: 'INBOX',
      });
    }
  }

  let insertedPieces = [] as any;
  if (piecesToCreate.length > 0) {
    insertedPieces = await pieceRepository.insertBatchLocalPieces(
      piecesToCreate as DbPiece[],
    );
    broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  }

  return {
    message: 'Routine tasks generated successfully',
    base_monday: thisMonday.toISOString().split('T')[0],
    is_fourth_monday: isFourthMonday,
    generated_count: insertedPieces.length,
    generated_tasks: insertedPieces,
  };
};
