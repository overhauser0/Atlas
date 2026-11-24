// atlas-server/src/controllers/review.controller.ts

import { Context } from 'hono';
import * as reviewService from '../services/review.service';

/**
 * GET /api/v1/reviews?month=202605
 * 指定された月のMonthlyとWeeklyを取得・作成する
 */
export const getReviews = async (c: Context) => {
  const month = c.req.query('month');

  if (!month || typeof month !== 'string' || month.length !== 6) {
    return c.json(
      { message: 'Invalid month format. Use YYYYMM (e.g., 202605)' },
      400,
    );
  }

  const data = await reviewService.getOrCreateMonthlyReview(month);
  return c.json(data, 200);
};

/**
 * PATCH /api/v1/reviews/:pageId
 * 指定されたページの特定プロパティ（テキスト）を更新する
 */
export const updateReview = async (c: Context) => {
  const pageId = c.req.param('pageId');

  if (!pageId) {
    return c.json({ message: 'Page ID is required' }, 400);
  }

  const body = await c.req.json();
  const { propertyName, text } = body;

  if (!propertyName) {
    return c.json({ error: 'propertyName is required' }, 400);
  }

  await reviewService.updateReviewText(pageId, propertyName, text || '');
  return c.json({ message: 'Review updated successfully' });
};
