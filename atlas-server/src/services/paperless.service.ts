// src/services/paperless.service.ts

import * as paperlessRepository from '../repositories/paperless.repository';
import { PaperlessDocumentInput } from '../models/paperless.model';
import { broadcast } from '../utils/websocket';
import axios, { AxiosResponse } from 'axios';

// Paperless-ngxへのアクセス設定（.envに追記が必要です）
const PAPERLESS_API_URL = process.env.PAPERLESS_API_URL;
const PAPERLESS_API_TOKEN = process.env.PAPERLESS_API_TOKEN;

// プロキシ通信用のAxiosクライアント
const apiClient = axios.create({
  baseURL: PAPERLESS_API_URL,
  headers: {
    Authorization: `Token ${PAPERLESS_API_TOKEN}`,
  },
});

/**
 * 1. 検索処理（UI表示用）
 * Postgresのキャッシュから爆速でドキュメント一覧を取得する
 */
export const getDocumentsFromCache = async (
  filters: paperlessRepository.PaperlessFilters,
) => {
  return await paperlessRepository.getPaperlessDocuments(filters);
};

/**
 * 2. プロキシ中継処理（B案の要）
 * Paperless APIからPDFデータを取得し、Node.jsのStreamとして返す
 */
export const getDocumentStream = async (
  paperlessId: number,
  type: 'preview' | 'download' = 'preview',
) => {
  // preview: ブラウザでのインライン表示用, download: ダウンロード用
  const url = `/api/documents/${paperlessId}/${type}/`;

  // responseType: 'stream' にすることで、数MB〜数十MBのPDFデータを
  // メモリに溜め込まず、右から左へ受け流すことができます（激速＆省メモリ）
  const response = await apiClient.get(url, {
    responseType: 'stream',
  });

  return {
    stream: response.data,
    contentType: response.headers['content-type'],
    contentDisposition: response.headers['content-disposition'],
  };
};

/**
 * 3. Webhook受信・同期処理
 * Paperless側で書類が追加/更新された時にキャッシュを更新し、UIに通知する
 */
export const handleWebhookUpsert = async (payload: any) => {
  // 💡 PaperlessのWebhookペイロードからDBの型にマッピング
  // ※実際のPaperless Webhookの仕様に合わせてプロパティ名は微調整が必要です
  const documentInput: PaperlessDocumentInput = {
    paperless_id: payload.id,
    title: payload.title,
    asn: payload.archive_serial_number || null,
    document_type: payload.document_type || null,
    correspondent: payload.correspondent || null,
    tags: payload.tags || [],
  };

  const result =
    await paperlessRepository.upsertPaperlessDocument(documentInput);

  // Gleisの「Documents View」を開いているブラウザがあれば即座にリロードさせる
  broadcast(JSON.stringify({ type: 'REFRESH_DOCUMENTS' }));

  return result;
};

/**
 * 4. Webhook削除処理
 * Paperless側で書類が削除された時にキャッシュも消す
 */
export const handleWebhookDelete = async (paperlessId: number) => {
  const result = await paperlessRepository.deletePaperlessDocument(paperlessId);
  broadcast(JSON.stringify({ type: 'REFRESH_DOCUMENTS' }));
  return result;
};

/**
 * 5. 全件一括同期（過去データ＆不整合解消用）
 * PaperlessのAPIから全ドキュメントを取得し、ローカルDBを最新化する
 */
/**
 * Paperless-ngxのメタデータ（タグ等）を全件取得し、{ id: '名前' } の辞書を作成する
 */
const fetchMetadataMap = async (
  endpoint: string,
): Promise<Record<number, string>> => {
  const mapping: Record<number, string> = {};
  let nextUrl: string | null = endpoint;

  while (nextUrl) {
    const response: AxiosResponse<any> = await apiClient.get(nextUrl);
    const data = response.data;
    for (const item of data.results) {
      mapping[item.id] = item.name;
    }
    nextUrl = data.next;
  }
  return mapping;
};

interface PaperlessListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[]; // 中身を細かく定義することも可能ですが、今回はany[]で十分です
}

export const syncAllDocuments = async () => {
  console.log('🔄 Paperless-ngx 全件同期を開始します...');

  // 1. 同期前にメタデータの辞書（ID -> 名前）を一括作成する
  console.log('メタデータ（タグ、ドキュメントタイプ、送信元）を取得中...');
  const tagsMap = await fetchMetadataMap('/api/tags/');
  const docTypesMap = await fetchMetadataMap('/api/document_types/');
  const correspondentsMap = await fetchMetadataMap('/api/correspondents/');

  let nextUrl: string | null = '/api/documents/';
  let totalSynced = 0;

  try {
    while (nextUrl) {
      const response: AxiosResponse<PaperlessListResponse> =
        await apiClient.get(nextUrl);
      const data: PaperlessListResponse = response.data;

      for (const doc of data.results) {
        const documentInput: PaperlessDocumentInput = {
          paperless_id: doc.id,
          title: doc.title,
          asn: doc.archive_serial_number || null,

          // 💡 辞書を使ってIDをStringに変換（存在しなければnull）
          document_type: doc.document_type
            ? docTypesMap[doc.document_type] || null
            : null,
          correspondent: doc.correspondent
            ? correspondentsMap[doc.correspondent] || null
            : null,

          // 💡 配列内のタグIDを名前に変換し、undefinedを除外する
          tags: doc.tags
            ? doc.tags.map((id: number) => tagsMap[id]).filter(Boolean)
            : [],
        };

        await paperlessRepository.upsertPaperlessDocument(documentInput);
        totalSynced++;
      }

      nextUrl = data.next;
    }

    console.log(
      `✅ 同期完了: ${totalSynced} 件のドキュメントをキャッシュしました。`,
    );
    broadcast(JSON.stringify({ type: 'REFRESH_DOCUMENTS' }));

    return { success: true, totalSynced };
  } catch (error) {
    console.error('❌ 全件同期中にエラーが発生しました:', error);
    throw error;
  }
};
