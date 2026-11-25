import { Server as HttpServer } from 'http';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import * as errorController from './controllers/error.controller';
import * as notificationController from './controllers/notification.controller';
import * as pieceController from './controllers/piece.controller';
import * as reviewController from './controllers/review.controller';
import * as diaryController from './controllers/diary.controller';
import * as calendarController from './controllers/calendar.controller';
import * as aiController from './controllers/ai.controller';
import * as noteController from './controllers/note.controller';
import * as agentController from './controllers/agent.controller';
import * as immichController from './controllers/immich.controller';
import * as paperlessController from './controllers/paperless.controller';
import * as routineController from './controllers/routine.controller';
import * as taskPresetController from './controllers/task-preset.controller';
import * as personController from './controllers/person.controller';
import * as sparkController from './controllers/spark.controller';
import { initWebSocket } from './utils/websocket';
import { issueWsTicket, WS_TICKET_TTL_SEC } from './utils/ws-ticket';
import { timingSafeCompare } from './utils/utils';

const app = new Hono();

// Middleware: CORS（CORS_ALLOWED_ORIGINS が設定されている場合は指定オリジンのみ許可）
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  app.use(
    '/*',
    cors({
      origin: (origin) => (allowedOrigins.includes(origin) ? origin : ''),
      allowHeaders: ['Content-Type', 'X-API-KEY'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
} else {
  console.warn(
    '[CORS] CORS_ALLOWED_ORIGINS is not set; allowing all origins. Set CORS_ALLOWED_ORIGINS in production.',
  );
  app.use('/*', cors());
}

// --- 🔒 APIキー認証ミドルウェア ---
app.use('/api/v1/*', async (c, next) => {
  // リクエストヘッダーからAPIキーを取得
  const apiKey = c.req.header('X-API-KEY');
  const expectedKey = process.env.ATLAS_API_KEY;

  // サーバー側の環境変数が未設定、またはキーが一致しない場合は401を返す
  if (!timingSafeCompare(apiKey, expectedKey)) {
    console.warn('[Auth] Unauthorized API access attempt');
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  await next();
});
// ----------------------------------

// --- 🛡️ /auth/verify レート制限（IPごと・15分間で最大10回失敗まで） ---
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const authFailureBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

const getClientIp = (c: { req: { header: (name: string) => string | undefined } }) => {
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return c.req.header('x-real-ip')?.trim() || 'unknown';
};

const pruneExpiredAuthBuckets = (now: number) => {
  for (const [ip, bucket] of authFailureBuckets.entries()) {
    if (now >= bucket.resetAt) {
      authFailureBuckets.delete(ip);
    }
  }
};

// Routes
app.get('/health', (c) => c.json({ status: 'UP', time: new Date() }));

app.post('/auth/verify', async (c) => {
  const now = Date.now();
  pruneExpiredAuthBuckets(now);

  const clientIp = getClientIp(c);
  const existingBucket = authFailureBuckets.get(clientIp);
  if (
    existingBucket &&
    existingBucket.count >= AUTH_RATE_LIMIT_MAX_ATTEMPTS &&
    now < existingBucket.resetAt
  ) {
    const retryAfterSec = Math.ceil((existingBucket.resetAt - now) / 1000);
    c.header('Retry-After', String(retryAfterSec));
    console.warn(`[Auth] Rate limit exceeded for IP: ${clientIp}`);
    return c.json(
      { success: false, error: 'Too many failed attempts. Try again later.' },
      429,
    );
  }

  let body: { password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const inputPassword =
    typeof body?.password === 'string' ? body.password : undefined;
  const expectedPassword = process.env.ATLAS_PASSWORD;

  if (!timingSafeCompare(inputPassword, expectedPassword)) {
    const nextCount = (existingBucket?.count || 0) + 1;
    authFailureBuckets.set(clientIp, {
      count: nextCount,
      resetAt: existingBucket?.resetAt ?? now + AUTH_RATE_LIMIT_WINDOW_MS,
    });
    console.warn('[Auth] Password verification failed');
    return c.json({ success: false, error: 'Invalid password' }, 401);
  }

  authFailureBuckets.delete(clientIp);
  console.log('[Auth] Password verification succeeded');
  return c.json({ success: true });
});

// /api/v1 プレフィックスで整理
const api = new Hono();
// auth (BFF向け短命WebSocketチケット発行)
api.post('/auth/ws-ticket', (c) => {
  const ticket = issueWsTicket();
  return c.json({ ticket, expiresInSec: WS_TICKET_TTL_SEC });
});
// notification
api.post('/push', notificationController.receivePush);
api.get('/notifications', notificationController.getNotificationHistory);
api.post('/notifications/read', notificationController.markAllAsRead);
api.post('/notifications/:id/read', notificationController.markAsRead);

// Piece
api.get('/pieces', pieceController.getPieces);
api.post('/pieces', pieceController.createPiece);
api.post('/pieces/bulk', pieceController.createPiecesBulk);
api.get('/pieces/sync', pieceController.getLastSyncTime);
api.post('/pieces/sync', pieceController.syncPieces);
api.post(
  '/pieces/reschedule-overdue',
  pieceController.rescheduleOverduePiecesToToday,
);
api.get('/pieces/:id/people', personController.getPiecePeople);
api.get('/pieces/:id', pieceController.getPieceById);
api.get('/pieces/:id/blocks', pieceController.getPieceBlocks);
api.post('/pieces/:id/blocks', pieceController.appendPieceBlocks);
api.post('/pieces/:id/promote', pieceController.promotePiece);
api.patch('/pieces/:id', pieceController.updatePiece);
api.delete('/pieces/:id', pieceController.deletePiece);
api.post('/pieces/:id/apply-preset', taskPresetController.applyTaskPreset);

// Task presets
api.get('/task-presets', taskPresetController.getTaskPresets);
api.post('/task-presets', taskPresetController.createTaskPreset);
api.get('/task-presets/:id', taskPresetController.getTaskPreset);
api.patch('/task-presets/:id', taskPresetController.updateTaskPreset);
api.delete('/task-presets/:id', taskPresetController.deleteTaskPreset);

// People
api.get('/people', personController.getPeople);
api.post('/people', personController.createPerson);
api.get('/people/:id', personController.getPerson);
api.patch('/people/:id', personController.updatePerson);
api.patch('/people/:id/immich', personController.updateImmichPerson);
api.delete('/people/:id', personController.deletePerson);
api.get('/people/:id/pieces', personController.getPersonPieces);
api.post('/people/:id/pieces', personController.createPersonPiece);
api.get(
  '/people/:id/pieces/:personPieceId',
  personController.getPersonPiece,
);
api.patch(
  '/people/:id/pieces/:personPieceId',
  personController.updatePersonPiece,
);
api.delete(
  '/people/:id/pieces/:personPieceId',
  personController.deletePersonPiece,
);

// Monthly,Weekly
api.get('/reviews', reviewController.getReviews);
api.patch('/reviews/:pageId', reviewController.updateReview);

// Diary
api.get('/diaries', diaryController.getDiaries);
api.get('/diaries/:date', diaryController.getDiaryByDate);
api.post('/diaries', diaryController.upsertDiary);
api.patch('/diaries/:date', diaryController.updateDiary);

// Sparks
api.get('/sparks', sparkController.getSparks);
api.post('/sparks', sparkController.createSpark);
api.post('/sparks/sync', sparkController.syncSparks);
api.patch('/sparks/:id/consume', sparkController.consumeSpark);
api.post('/sparks/consume-bulk', sparkController.consumeSparksBulk);
api.delete('/sparks/:id', sparkController.deleteSpark);

// Google Calendar
api.get('/calendar/events', calendarController.getEvents);
api.post('/calendar/sync', calendarController.receiveCalendarSync);

// Gemini
api.post('/ai', aiController.execute);
api.get('/ai/agents', agentController.getAgents);
api.post('/ai/agents', agentController.createAgent);
api.get('/ai/agents/:id', agentController.getAgent);
api.patch('/ai/agents/:id', agentController.updateAgent);
api.delete('/ai/agents/:id', agentController.deleteAgent);

// Note
api.get('/notes', noteController.getNotes);
api.post('/notes', noteController.createNote);
api.patch('/notes/:id', noteController.updateNote);
api.delete('/notes/:id', noteController.deleteNote);

// Routine
api.get('/routines', routineController.getRoutines);
api.post('/routines', routineController.createRoutine);
api.post('/routines/generate', routineController.generateRoutineTasks);
api.patch('/routines/:id', routineController.updateRoutine);
api.delete('/routines/:id', routineController.deleteRoutine);

// immich
api.get('/immich/stats', immichController.getImmichStats);
api.post('/immich/sync', immichController.syncImmichStats);
api.get('/immich/missing-dates', immichController.getMissingDates);
api.post('/immich/batch/dates', immichController.updateMissingDates);
api.post('/immich/search', immichController.searchAssets);
api.get('/immich/people/search', immichController.searchPeopleByName);
api.get('/immich/assets/:id/thumbnail', immichController.getThumbnail);

// paperless-ngx
api.get('/paperless', paperlessController.getDocuments);
api.post('/paperless/:id/ticket', paperlessController.generateViewTicket);
api.post('/paperless/webhook', paperlessController.handleWebhook);
api.post('/paperless/sync', paperlessController.syncDocuments);
api.post('/paperless/upload', paperlessController.uploadDocument);
app.get('/paperless/view', paperlessController.viewDocumentWithTicket); // 認証不要

app.route('/api/v1', api);

app.onError(errorController.handleServerError);

const port = 5675;
console.log(`🚀 Atlas Server (Hono) running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

if (server instanceof HttpServer) {
  initWebSocket(server);
}
