// src/models/paperless.model.ts

import { z } from 'zod';
import { Generated } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

export const PaperlessDocumentSchema = z.object({
  id: z.number().optional(), // DB側で自動採番
  paperless_id: z.number().int(),
  title: z.string().min(1),
  asn: z.number().int().nullable().optional(),
  document_type: z.string().nullable().optional(),
  correspondent: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  document_date: z.date().nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// 新規登録・更新時のペイロード用（ID等を除外または任意にしたもの）
export const PaperlessDocumentInputSchema = PaperlessDocumentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type PaperlessDocument = z.infer<typeof PaperlessDocumentSchema>;
export type PaperlessDocumentInput = z.infer<
  typeof PaperlessDocumentInputSchema
>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface PaperlessDocumentsTable {
  id: Generated<number>;
  paperless_id: number;
  title: string;
  asn: number | null;
  document_type: string | null;
  correspondent: string | null;
  tags: string[] | null; // Kyselyの配列マッピング用
  document_date: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
