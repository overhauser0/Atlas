import { Context } from 'hono';
import * as reviewService from '../services/review.service';

/**
 * GET /api/v1/reviews?month=202605
 * 指定された月のMonthlyとWeeklyを取得・作成する
 */
export const getReviews = async (c: Context) => {
  try {
    // Honoでのクエリパラメータの取得
    const month = c.req.query('month');

    if (!month || typeof month !== 'string' || month.length !== 6) {
      return c.json(
        { error: 'Invalid month format. Use YYYYMM (e.g., 202605)' },
        400,
      );
    }

    const data = await reviewService.getOrCreateMonthlyReview(month);
    return c.json(data);
  } catch (error) {
    console.error('Error fetching/creating reviews:', error);
    // index.tsのグローバルエラーハンドラーに任せるために throw しても良いですが、
    // ここでは安全に500エラーを返します
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
};

/**
 * PATCH /api/v1/reviews/:pageId
 * 指定されたページの特定プロパティ（テキスト）を更新する
 */
export const updateReview = async (c: Context) => {
  try {
    // HonoでのURLパラメータの取得
    const pageId = c.req.param('pageId');

    if (!pageId) {
      return c.json({ error: 'Page ID is required' }, 400);
    }

    // HonoでのJSONボディの取得
    const body = await c.req.json();
    const { propertyName, text } = body;

    if (!propertyName) {
      return c.json({ error: 'propertyName is required' }, 400);
    }

    await reviewService.updateReviewText(pageId, propertyName, text || '');
    return c.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    return c.json({ error: 'Failed to update review' }, 500);
  }
};
