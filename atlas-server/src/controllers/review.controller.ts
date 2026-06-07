import { Context } from 'hono';
import * as reviewService from '../services/review.service';

/**
 * GET /api/v1/reviews?month=202605
 * 指定された月のMonthlyとWeeklyを取得・作成する
 */
export const getReviews = async (c: Context) => {
  try {
    const month = c.req.query('month');

    if (!month || typeof month !== 'string' || month.length !== 6) {
      return c.json(
        { message: 'Invalid month format. Use YYYYMM (e.g., 202605)' },
        400,
      );
    }

    // Serviceは純粋な文字列(month)だけを受け取るため、Honoに依存していない
    const data = await reviewService.getOrCreateMonthlyReview(month);

    return c.json(data, 200);
  } catch (error: any) {
    console.error('❌ Get Reviews Error:', error);
    return c.json(
      { message: error.message || 'Failed to fetch/create reviews' },
      500,
    );
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
      return c.json({ message: 'Page ID is required' }, 400);
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
