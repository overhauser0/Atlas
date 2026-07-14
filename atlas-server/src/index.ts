import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import * as pushController from './controllers/push.controller';
import * as pieceController from './controllers/piece.controller';
import * as reviewController from './controllers/review.controller';
import * as diaryController from './controllers/diary.controller';
import * as calendarController from './controllers/calendar.controller';
import * as aiController from './controllers/ai.controller';
import * as noteController from './controllers/note.controller';
import * as pgRepo from './repositories/postgres.repository';
import { initWebSocket } from './utils/websocket';

const app = new Hono();

// Middleware
app.use('/*', cors());

// --- 🔒 APIキー認証ミドルウェア ---
app.use('/api/v1/*', async (c, next) => {
  // リクエストヘッダーからAPIキーを取得
  const apiKey = c.req.header('X-API-KEY');
  const expectedKey = process.env.ATLAS_API_KEY;

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

app.post('/auth/verify', async (c) => {
  const body = await c.req.json();
  const inputPassword = body.password;
  const expectedPassword = process.env.ATLAS_PASSWORD;

  if (!expectedPassword || inputPassword !== expectedPassword) {
    console.warn('[Auth] Password verification failed');
    return c.json({ success: false, error: 'Invalid password' }, 401);
  }

  console.log('[Auth] Password verification succeeded');
  return c.json({ success: true });
});

// /api/v1 プレフィックスで整理
const api = new Hono();
// 通知
api.post('/push', pushController.receivePush);
api.get('/notifications', pushController.getNotificationHistory);
api.post('/notifications/read', pushController.markAllAsRead);
api.post('/notifications/:id/read', pushController.markAsRead);

// Piece
api.get('/pieces', pieceController.getPieces);
api.post('/pieces', pieceController.createPiece);
api.post('/pieces/:id/promote', pieceController.promotePiece);
api.patch('/pieces/:id', pieceController.updatePiece);
api.delete('/pieces/:id', pieceController.deletePiece);
api.get('/pieces/:id/blocks', pieceController.getPieceBlocks);
api.get('/pieces/sync', pieceController.getLastSyncTime);
api.post('/pieces/sync', pieceController.syncPieces);
api.post(
  '/pieces/reschedule-overdue',
  pieceController.rescheduleOverduePiecesToToday,
);

// Monthly,Weekly
api.get('/reviews', reviewController.getReviews);
api.patch('/reviews/:pageId', reviewController.updateReview);

// Diary
api.get('/diaries', diaryController.getDiaries);
api.patch('/diaries/:id', diaryController.updateDiary);
api.post('/diaries/sync', diaryController.syncDiaries);

// Google Calendar
api.get('/calendar/events', calendarController.getEvents);
api.post('/calendar/sync', calendarController.receiveCalendarSync);

// Gemini
api.post('/ai/brainstorm', aiController.brainstorm);
api.post('/ai/parse-task', aiController.parseTask);

// Note
api.get('/notes', noteController.getNotes);
api.post('/notes', noteController.createNote);
api.patch('/notes/:id', noteController.updateNote);
api.delete('/notes/:id', noteController.deleteNote);

app.route('/api/v1', api);

// エラー通知
app.onError(async (err, c) => {
  console.warn(`[Server Error]: ${err.message}`);

  // エラーを通知履歴に保存する
  try {
    await pgRepo.insertNotification({
      title: '🚫 System Internal Error',
      note: `A server-side error occurred: ${err.message}`,
      category: 'ALERT',
    });
  } catch (e) {
    console.warn('Failed to archive error notification', e);
  }

  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

const port = 5675;
console.log(`🚀 Atlas Server (Hono) running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

initWebSocket(server as any);
