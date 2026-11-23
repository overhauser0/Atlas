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
  return await routineRepository.createRoutine({
    ...validatedData,
    parent_id: validatedData.parent_id ?? null,
  });
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

const getJstTodayUtcDate = (now: Date = new Date()): Date => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return new Date(Date.UTC(year, month - 1, day));
};

const formatUtcDateYmd = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

const getDaysInUtcMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * アクティブなルーチンからタスクを作成する。
 */
export const generateRoutineTasks = async () => {
  const activeRoutines = await routineRepository.getAllRoutines(
    undefined,
    true,
  );

  // JSTの日付をUTCの00:00として扱うことで、サーバーのローカルタイムゾーンに依存しない日付計算を行う
  const jstToday = getJstTodayUtcDate();
  const currentDayOfWeek = jstToday.getUTCDay();
  const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const thisMonday = new Date(jstToday);
  thisMonday.setUTCDate(jstToday.getUTCDate() - daysToMonday);

  const mondayDateNum = thisMonday.getUTCDate();
  const isFourthMonday = mondayDateNum >= 22 && mondayDateNum <= 28;

  let nextMonthYear = thisMonday.getUTCFullYear();
  let nextMonth = thisMonday.getUTCMonth() + 1;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextMonthYear++;
  }
  const daysInNextMonth = getDaysInUtcMonth(nextMonthYear, nextMonth);

  const piecesToCreate: Partial<DbPiece>[] = [];

  for (const routine of activeRoutines) {
    if (routine.frequency === 'weekly') {
      const targetDayOfWeek = routine.day_of_week ?? 1;
      const offsetFromMonday = targetDayOfWeek === 0 ? 6 : targetDayOfWeek - 1;

      const dueDate = new Date(thisMonday);
      dueDate.setUTCDate(thisMonday.getUTCDate() + offsetFromMonday);

      piecesToCreate.push({
        area: 'Work',
        title: routine.title,
        start_date: formatUtcDateYmd(dueDate),
        note: routine.note || '',
        url: routine.url || '',
        parent_id: routine.parent_id || null,
        status: 'INBOX',
      });
    } else if (routine.frequency === 'monthly' && isFourthMonday) {
      let dueDate: Date | null = null;

      if (routine.type === 'date') {
        const clampedDay = Math.min(Math.max(routine.day || 1, 1), daysInNextMonth);
        dueDate = new Date(Date.UTC(nextMonthYear, nextMonth, clampedDay));
      } else if (routine.type === 'nthWeekday') {
        const targetWeek = routine.week || 1;
        const targetDayOfWeek = routine.day_of_week ?? 1;

        const firstOfMonth = new Date(Date.UTC(nextMonthYear, nextMonth, 1));
        const firstDayOfMonth = firstOfMonth.getUTCDay();
        let offset = targetDayOfWeek - firstDayOfMonth;
        if (offset < 0) offset += 7;

        const targetDay = 1 + offset + (targetWeek - 1) * 7;
        // 第5曜日などが翌月に存在しない場合は翌々月へのオーバーフローを防ぐためスキップする
        if (targetDay <= daysInNextMonth) {
          dueDate = new Date(Date.UTC(nextMonthYear, nextMonth, targetDay));
        }
      }

      if (!dueDate) continue;

      piecesToCreate.push({
        area: 'Work',
        title: routine.title,
        start_date: formatUtcDateYmd(dueDate),
        note: routine.note || '',
        url: routine.url || '',
        parent_id: routine.parent_id || null,
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
    base_monday: formatUtcDateYmd(thisMonday),
    is_fourth_monday: isFourthMonday,
    generated_count: insertedPieces.length,
    generated_tasks: insertedPieces,
  };
};
