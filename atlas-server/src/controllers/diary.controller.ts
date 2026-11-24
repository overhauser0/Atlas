// atlas-server/src/controllers/diary.controller.ts

import { Context } from 'hono';
import {
  CreateDiarySchema,
  DiaryDateSchema,
  DiaryRangeQuerySchema,
  UpdateDiarySchema,
} from '../models/diary.model';
import * as diaryService from '../services/diary.service';

/** [GET] ローカルDBに保存されている日記を取得する */
export const getDiaries = async (c: Context) => {
  const range = DiaryRangeQuerySchema.safeParse({
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
  });
  if (!range.success) {
    return c.json(
      { message: 'Invalid date range', errors: range.error.format() },
      400,
    );
  }

  const diaries = await diaryService.getDiaries(range.data);
  return c.json({ diaries }, 200);
};

/** [GET] 日付指定で日記を取得する */
export const getDiaryByDate = async (c: Context) => {
  const date = DiaryDateSchema.safeParse(c.req.param('date'));
  if (!date.success) {
    return c.json(
      { message: 'Invalid diary date', errors: date.error.format() },
      400,
    );
  }

  const diary = await diaryService.getDiaryByDate(date.data);
  if (!diary) {
    return c.json({ message: 'Diary not found' }, 404);
  }
  return c.json({ diary }, 200);
};

/** [POST] 日付をキーに日記を作成または上書きする */
export const upsertDiary = async (c: Context) => {
  const rawData = await c.req.json();
  const validation = CreateDiarySchema.safeParse(rawData);
  if (!validation.success) {
    return c.json(
      { message: 'Invalid input data', errors: validation.error.format() },
      400,
    );
  }

  const diary = await diaryService.upsertDiary(validation.data);
  return c.json({ diary }, 200);
};

/** [PATCH] 日付指定で日記を部分更新する */
export const updateDiary = async (c: Context) => {
  const date = DiaryDateSchema.safeParse(c.req.param('date'));
  if (!date.success) {
    return c.json(
      { message: 'Invalid diary date', errors: date.error.format() },
      400,
    );
  }

  const rawData = await c.req.json();
  const validation = UpdateDiarySchema.safeParse(rawData);

  if (!validation.success) {
    console.warn(
      `⚠️ Validation failed for updateDiary (${date.data}):`,
      validation.error.format(),
    );
    return c.json(
      {
        message: 'Invalid input data',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const updatedDiary = await diaryService.updateDiaryByDate(
    date.data,
    validation.data,
  );
  if (!updatedDiary) {
    return c.json({ message: 'Diary not found' }, 404);
  }

  return c.json({ diary: updatedDiary }, 200);
};
