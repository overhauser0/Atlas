// atlas-server/src/controllers/paperless.controller.ts

import { Context } from 'hono';
import crypto from 'crypto';
import * as paperlessService from '../services/paperless.service';

// ==========================================
// 1. 検索・一覧取得
// ==========================================
export const getDocuments = async (c: Context) => {
  const title = c.req.query('title');
  const document_type = c.req.query('document_type');
  const correspondent = c.req.query('correspondent');
  const asnParam = c.req.query('asn');
  const tagsParam = c.req.query('tags');

  let asn: number | undefined;
  if (asnParam !== undefined && asnParam !== '') {
    asn = Number(asnParam);
    if (!Number.isInteger(asn)) {
      return c.json({ message: 'Invalid ASN parameter' }, 400);
    }
  }

  const documents = await paperlessService.getDocumentsFromCache({
    title,
    document_type,
    correspondent,
    asn,
    tags: tagsParam ? tagsParam.split(',').filter(Boolean) : undefined,
  });

  return c.json({ documents: documents || [] }, 200);
};

// ==========================================
// 2. プロキシ中継 (PDFストリーミング)
// ==========================================
// ワンタイム閲覧チケットを保持するインメモリキャッシュ（60秒で失効）
const ticketCache = new Map<string, number>();

/**
 * チケット発行エンドポイント（X-API-KEY 必須）
 * POST /api/v1/paperless/:id/ticket
 */
export const generateViewTicket = async (c: Context) => {
  const paperlessId = Number(c.req.param('id'));
  if (!Number.isInteger(paperlessId) || paperlessId <= 0) {
    return c.json({ message: 'Invalid document ID' }, 400);
  }

  const ticket = crypto.randomUUID();
  ticketCache.set(ticket, paperlessId);

  setTimeout(() => {
    ticketCache.delete(ticket);
  }, 60 * 1000);

  return c.json({ ticket }, 200);
};

/**
 * PDF表示エンドポイント（X-API-KEY 不要、URLパラメータのワンタイムチケットで認証）
 * GET /paperless/view?ticket=xxxx-xxxx...
 */
export const viewDocumentWithTicket = async (c: Context) => {
  const ticket = c.req.query('ticket');

  if (!ticket || !ticketCache.has(ticket)) {
    return c.text('Forbidden: Invalid or expired ticket', 403);
  }

  const paperlessId = ticketCache.get(ticket)!;
  ticketCache.delete(ticket);

  const result = await paperlessService.getDocumentStream(
    paperlessId,
    'preview',
  );

  if (!result.ok || !result.stream) {
    return c.text('Document not found in Paperless', 404);
  }

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': result.contentDisposition,
    },
  });
};

// ==========================================
// 3. Webhook受信エンドポイント
// ==========================================
export const handleWebhook = async (c: Context) => {
  const rawBody = await c.req.text();
  const payload = rawBody ? JSON.parse(rawBody) : null;

  if (!payload || !payload.id) {
    return c.json({ message: 'Invalid webhook payload: id not found' }, 400);
  }

  await paperlessService.handleWebhookUpsert(payload);
  return c.json({ message: 'Webhook processed successfully' }, 200);
};

// ==========================================
// 4. 手動/バッチ同期用エンドポイント
// ==========================================
export const syncDocuments = async (c: Context) => {
  const result = await paperlessService.syncAllDocuments();
  return c.json({ message: 'Sync completed successfully', result }, 200);
};

// ==========================================
// 5. ファイルアップロードの受付
// ==========================================
export const uploadDocument = async (c: Context) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ message: 'Valid file is required' }, 400);
  }

  const taskId = await paperlessService.uploadDocumentToPaperless(file);
  return c.json(
    { message: 'Upload started successfully', task: taskId },
    202,
  );
};
