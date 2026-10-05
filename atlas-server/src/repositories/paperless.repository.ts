// src/repositories/paperless.repository.ts

import { db } from '../db/client';
import { PaperlessDocumentInput } from '../models/paperless.model';
import { sql } from 'kysely';

export interface PaperlessFilters {
  title?: string;
  document_type?: string;
  correspondent?: string;
  asn?: number;
  tags?: string[];
}

/**
 * 条件に一致するドキュメントをキャッシュテーブルから取得する
 */
export const getPaperlessDocuments = async (filters: PaperlessFilters) => {
  let q = db.selectFrom('paperless_documents').selectAll();

  // タイトルは部分一致（大文字小文字を区別しない ilike を使用）
  if (filters.title) {
    q = q.where('title', 'ilike', `%${filters.title}%`);
  }

  if (filters.document_type) {
    q = q.where('document_type', '=', filters.document_type);
  }

  if (filters.correspondent) {
    q = q.where('correspondent', '=', filters.correspondent);
  }

  if (filters.asn) {
    q = q.where('asn', '=', filters.asn);
  }

  // タグの配列検索（PostgreSQLの配列オーバーラップ演算子 && を使用して、いずれかのタグを含むものを検索）
  if (filters.tags && filters.tags.length > 0) {
    q = q.where(sql<boolean>`tags && ARRAY[${sql.join(filters.tags)}]::text[]`);
  }

  // 最新のドキュメントから順に返す
  return await q.orderBy('document_date', 'desc').execute();
};

/**
 * Paperless側のIDで単一のドキュメントを取得する
 */
export const getDocumentByPaperlessId = async (paperlessId: number) => {
  return await db
    .selectFrom('paperless_documents')
    .selectAll()
    .where('paperless_id', '=', paperlessId)
    .executeTakeFirst();
};

/**
 * Webhookから受け取ったドキュメント情報を追加または更新（Upsert）する
 */
export const upsertPaperlessDocument = async (
  input: PaperlessDocumentInput,
) => {
  const values = {
    ...input,
    updated_at: new Date(),
  };

  return await db
    .insertInto('paperless_documents')
    .values(values as any)
    .onConflict((oc) =>
      // paperless_id が重複した場合はデータを上書き更新する
      oc.column('paperless_id').doUpdateSet(values as any),
    )
    .returningAll()
    .executeTakeFirst();
};

/**
 * Paperless側でドキュメントが削除された場合にキャッシュからも削除する
 */
export const deletePaperlessDocument = async (paperlessId: number) => {
  return await db
    .deleteFrom('paperless_documents')
    .where('paperless_id', '=', paperlessId)
    .returningAll()
    .executeTakeFirst();
};

// 存在するIDのリストを受け取り、それに含まれないものを全削除する
export const deleteDocumentsNotIn = async (validIds: number[]) => {
  // もしPaperless側が空っぽ（0件）なら、キャッシュも全削除
  if (validIds.length === 0) {
    return await db.deleteFrom('paperless_documents').execute();
  }

  // validIds に含まれない（not in）paperless_id を一括削除
  return await db
    .deleteFrom('paperless_documents')
    .where('paperless_id', 'not in', validIds)
    .execute();
};
