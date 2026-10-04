// src/controllers/paperless.controller.ts

import { Context } from 'hono';
import * as paperlessService from '../services/paperless.service';

// ==========================================
// 1. 検索・一覧取得
// ==========================================
export const getDocuments = async (c: Context) => {
  try {
    // URLクエリから条件を取得（カンマ区切りのタグも配列に変換）
    const title = c.req.query('title');
    const document_type = c.req.query('document_type');
    const correspondent = c.req.query('correspondent');
    const asnParam = c.req.query('asn');
    const tagsParam = c.req.query('tags');

    const documents = await paperlessService.getDocumentsFromCache({
      title,
      document_type,
      correspondent,
      asn: asnParam ? parseInt(asnParam, 10) : undefined,
      tags: tagsParam ? tagsParam.split(',') : undefined,
    });

    return c.json({ documents: documents || [] }, 200);
  } catch (error: any) {
    console.error('❌ Get Paperless Documents Error:', error);
    return c.json(
      { message: error.message || 'Failed to fetch documents' },
      500,
    );
  }
};

// ==========================================
// 2. プロキシ中継 (PDFストリーミング)
// ==========================================
export const streamDocument = async (c: Context) => {
  try {
    const idParam = c.req.param('id');
    const typeParam =
      c.req.query('type') === 'download' ? 'download' : 'preview';

    if (!idParam) return c.json({ message: 'Document ID is required' }, 400);

    const paperlessId = parseInt(idParam, 10);
    const { stream, contentType, contentDisposition } =
      await paperlessService.getDocumentStream(paperlessId, typeParam);

    // HonoのレスポンスヘッダーにPaperlessから受け取ったMIMEタイプ等をそのまま横流しする
    if (contentType) c.header('Content-Type', contentType as string);
    if (contentDisposition)
      c.header('Content-Disposition', contentDisposition as string);

    // Node.jsのストリームをそのままボディに渡す（メモリを消費しない）
    return c.body(stream as any);
  } catch (error: any) {
    console.error('❌ Stream Document Error:', error);
    return c.json({ message: 'Failed to stream document from Paperless' }, 500);
  }
};

// ==========================================
// 3. Webhook受信エンドポイント
// ==========================================
export const handleWebhook = async (c: Context) => {
  try {
    // 💡 1. どんなデータが来ているか、まずはテキストとしてそのまま受け取ってログに出す
    const rawBody = await c.req.text();
    console.log('📦 Webhook Raw Payload:', rawBody);

    // 💡 2. 手動でJSONに変換
    const payload = rawBody ? JSON.parse(rawBody) : null;

    // 💡 3. idが入っているかチェック
    if (!payload || !payload.id) {
      console.error(
        '❌ ID is missing in payload. 実際のデータ構造を確認してください。',
      );
      return c.json({ message: 'Invalid webhook payload: id not found' }, 400);
    }

    await paperlessService.handleWebhookUpsert(payload);

    return c.json({ message: 'Webhook processed successfully' }, 200);
  } catch (error: any) {
    console.error('❌ Webhook Error:', error);
    return c.json(
      { message: error.message || 'Failed to process webhook' },
      500,
    );
  }
};

// ==========================================
// 4. 手動/バッチ同期用エンドポイント
// ==========================================
export const syncDocuments = async (c: Context) => {
  try {
    const result = await paperlessService.syncAllDocuments();
    return c.json({ message: 'Sync completed successfully', result }, 200);
  } catch (error: any) {
    console.error('❌ Sync Documents Error:', error);
    return c.json(
      { message: error.message || 'Failed to sync documents' },
      500,
    );
  }
};
