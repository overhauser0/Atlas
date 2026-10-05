// src/controllers/paperless.controller.ts

import { Context } from 'hono';
import crypto from 'crypto';
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
// 💡 チケットを保存するインメモリキャッシュ（サーバー再起動で消える一時データ）
// 構造: { 'ランダムな文字列': paperless_id }
const ticketCache = new Map<string, number>();

/**
 * 1. チケット発行エンドポイント（X-API-KEY 必須）
 * POST /api/paperless/:id/ticket
 */
export const generateViewTicket = async (c: Context) => {
  try {
    const paperlessId = parseInt(c.req.param('id') as string, 10);

    // ランダムなUUIDを生成
    const ticket = crypto.randomUUID();

    // メモリに保存
    ticketCache.set(ticket, paperlessId);

    // 60秒後に自動でチケットを無効化（削除）する
    setTimeout(() => {
      ticketCache.delete(ticket);
    }, 60 * 1000);

    return c.json({ ticket }, 200);
  } catch (error) {
    console.error('Ticket generation error:', error);
    return c.json({ message: 'Failed to generate ticket' }, 500);
  }
};

/**
 * 2. PDF表示エンドポイント（X-API-KEY 不要、URLパラメータのチケットで認証）
 * GET /api/paperless/view?ticket=xxxx-xxxx...
 */
export const viewDocumentWithTicket = async (c: Context) => {
  try {
    const ticket = c.req.query('ticket');

    // チケットが存在しない、または期限切れ/使用済みの場合は弾く
    if (!ticket || !ticketCache.has(ticket)) {
      return c.text('Forbidden: Invalid or expired ticket', 403);
    }

    // キャッシュからIDを取り出し、すぐにチケットを削除（ワンタイム化）
    const paperlessId = ticketCache.get(ticket)!;
    ticketCache.delete(ticket);

    // ここでPaperless-ngxからPDF本体を取得する処理
    const response = await fetch(
      `${process.env.PAPERLESS_API_URL}/api/documents/${paperlessId}/preview/`,
      {
        headers: {
          Authorization: `Token ${process.env.PAPERLESS_API_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      return c.text('Document not found in Paperless', 404);
    }

    // PDFをブラウザにストリーミング
    const arrayBuffer = await response.arrayBuffer();

    // ヘッダーを適切に設定してPDFをインライン表示
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', 'inline; filename="document.pdf"');

    return c.body(arrayBuffer);
  } catch (error) {
    console.error('Document view error:', error);
    return c.text('Internal Server Error', 500);
  }
};

// ==========================================
// 3. Webhook受信エンドポイント
// ==========================================
export const handleWebhook = async (c: Context) => {
  try {
    // 1. どんなデータが来ているか、まずはテキストとしてそのまま受け取ってログに出す
    const rawBody = await c.req.text();
    console.log('📦 Webhook Raw Payload:', rawBody);

    // 2. 手動でJSONに変換
    const payload = rawBody ? JSON.parse(rawBody) : null;

    // 3. idが入っているかチェック
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

// ==========================================
// 5. ファイルアップロードの受付
// ==========================================
export const uploadDocument = async (c: Context) => {
  try {
    // 💡 Honoの parseBody で FormData を解析
    const body = await c.req.parseBody();
    const file = body['file']; // フロントエンドから 'file' という名前で送られてきます

    if (!file || !(file instanceof File)) {
      return c.json({ message: 'Valid file is required' }, 400);
    }

    // Serviceへ丸投げ
    const taskId = await paperlessService.uploadDocumentToPaperless(file);

    // 202 Accepted: 「受け付けました（裏でPaperlessが処理中です）」という意味のステータスコード
    return c.json(
      { message: 'Upload started successfully', task: taskId },
      202,
    );
  } catch (error: any) {
    console.error('❌ Upload Document Error:', error);
    return c.json(
      { message: error.message || 'Failed to upload document' },
      500,
    );
  }
};
