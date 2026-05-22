import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import * as pushController from './controllers/push.controller';
import * as taskController from './controllers/task.controller';
import * as reviewController from './controllers/review.controller';
import * as pgRepo from './repositories/postgres.repository';

const app = new Hono();

// Middleware
app.use('/*', cors());

// --- 🔒 APIキー認証ミドルウェア ---
app.use('/api/v1/*', async (c, next) => {
  // リクエストヘッダーからAPIキーを取得
  const apiKey = c.req.header('X-API-KEY');
  const expectedKey = process.env.GLEIS_API_KEY;

  // サーバー側の環境変数が未設定、またはキーが一致しない場合は401を返す
  if (!expectedKey || apiKey !== expectedKey) {
    console.warn('[Auth] Unauthorized API access attempt');
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  await next();
});
// ----------------------------------

// Routes
app.get('/health', (c) => c.json({ status: 'UP', time: new Date() }));

// /api/v1 プレフィックスで整理
const api = new Hono();
api.post('/push', pushController.receivePush);
api.get('/notifications', pushController.getNotificationHistory);
api.post('/notifications/read', pushController.markAllAsRead);
api.post('/notifications/:id/read', pushController.markAsRead);
api.get('/tasks', taskController.getTasks);
api.post('/tasks', taskController.createNewTask);
api.patch('/tasks/:id', taskController.updateTask);
api.get('/tasks/sync', taskController.getLastSyncTime);
api.post('/tasks/sync', taskController.syncTasks);
api.get('/reviews', reviewController.getReviews);
api.patch('/reviews/:pageId', reviewController.updateReview);

app.route('/api/v1', api);

// エラー通知
app.onError(async (err, c) => {
  console.warn(`[Server Error]: ${err.message}`);

  // エラーを通知履歴に保存する
  try {
    await pgRepo.archiveNotification({
      title: '🚫 System Internal Error',
      content: `A server-side error occurred: ${err.message}`,
      category: 'ALERT',
    });
  } catch (e) {
    console.warn('Failed to archive error notification', e);
  }

  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

const port = 5676;
console.log(`🚀 Gleis WorkOS Backend (Hono) running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
