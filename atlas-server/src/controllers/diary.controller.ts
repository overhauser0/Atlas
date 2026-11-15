import { Context } from 'hono';
import {
  CreateDiarySchema,
  UpdateDiarySchema,
} from '../models/diary.model';
import * as diaryService from '../services/diary.service';

/** [GET] ローカルDBに保存されている日記一覧を取得する */
export const getDiaries = async (c: Context) => {
  try {
    const diaries = await diaryService.getDiaries();
    return c.json({ diaries }, 200);
  } catch (error: any) {
    console.error('❌ Get Diaries Error:', error);
    return c.json(
      { message: error.message || 'Failed to retrieve diaries' },
      500,
    );
  }
};

/** [POST] ローカルDBに日記を作成する */
export const createDiary = async (c: Context) => {
  try {
    const rawData = await c.req.json();
    const validation = CreateDiarySchema.safeParse(rawData);

    if (!validation.success) {
      return c.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        400,
      );
    }

    const diary = await diaryService.createDiary(validation.data);
    return c.json({ diary }, 201);
  } catch (error: any) {
    if (error instanceof diaryService.DiaryDateConflictError) {
      return c.json({ message: error.message }, 409);
    }
    console.error('❌ Create Diary Error:', error);
    return c.json({ message: error.message || 'Failed to create diary' }, 500);
  }
};

/** [PATCH] ローカルDBの日記を更新する */
export const updateDiary = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Diary ID is required' }, 400);

    const rawData = await c.req.json();
    const validation = UpdateDiarySchema.safeParse(rawData);

    if (!validation.success) {
      console.warn(
        `⚠️ Validation failed for updateDiary (${id}):`,
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

    const updatedDiary = await diaryService.updateDiary(id, validation.data);
    if (!updatedDiary) {
      return c.json({ message: 'Diary not found' }, 404);
    }

    return c.json({ diary: updatedDiary }, 200);
  } catch (error: any) {
    if (error instanceof diaryService.DiaryDateConflictError) {
      return c.json({ message: error.message }, 409);
    }
    console.error(`❌ Update Diary Error (${c.req.param('id')}):`, error);
    return c.json({ message: error.message || 'Failed to update diary' }, 500);
  }
};
