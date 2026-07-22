import { Context } from 'hono';
import * as syncService from '../services/sync.service';
import { DiarySchema } from '../models/diary.model';
import * as diaryService from '../services/diary.service';

// ==========================================
// Diary Data Operations
// ==========================================

/**
 * [POST] 手動で日記のNotion同期を実行する
 */
export const syncDiaries = async (c: Context) => {
  try {
    const result = await syncService.syncDiariesNotionToLocal();
    return c.json({ ok: 'SYNC_SUCCESS', result }, 200);
  } catch (error: any) {
    console.error('❌ Sync Diaries Error:', error);
    return c.json({ message: error.message || 'Failed to sync diaries' }, 500);
  }
};

/**
 * [GET] DBにキャッシュされている日記一覧を取得する
 */
export const getDiaries = async (c: Context) => {
  try {
    const diaries = await diaryService.getDiaries();
    return c.json({ ok: 'SYNC_SUCCESS', diaries: diaries || [] }, 200);
  } catch (error: any) {
    console.error('❌ Get Diaries Error:', error);
    return c.json(
      { message: error.message || 'Failed to retrieve diaries' },
      500,
    );
  }
};

/**
 * [PATCH] 新しい日記の作成、または既存の日記の更新
 * フロントエンドから送られてきたデータをNotionに保存し、DBにも同期する
 */
export const updateDiary = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Diary ID is required' }, 400);

    const rawData = await c.req.json();

    const validation = DiarySchema.omit({ id: true })
      .partial()
      .safeParse(rawData);

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

    return c.json({ diary: updatedDiary }, 200);
  } catch (error: any) {
    console.error(`❌ Update Diary Error (${c.req.param('id')}):`, error);
    return c.json({ message: error.message || 'Failed to update diary' }, 500);
  }
};
