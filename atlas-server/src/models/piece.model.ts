// src/models/piece.models.ts

import { z } from 'zod';
import { ColumnType, Generated } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

// 基本となるPieceスキーマ
export const PieceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'タイトルは必須です'),
  note: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? ''),
  status: z
    .enum(['INBOX', 'Waiting', 'Going', 'Wrapper', 'Canceled', 'Done'])
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (!v ? 'INBOX' : v)),
  source: z
    .enum(['NOTION', 'LOCAL'])
    .or(z.literal(''))
    .nullable()
    .transform((v) => (!v ? 'LOCAL' : v)),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/)
    .nullable()
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/)
    .nullable()
    .optional(),
  area: z
    .enum(['Work', 'Life'])
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (!v ? 'Work' : v)),
  type: z
    .enum(['Task', 'Note', 'Event', 'Memo'])
    .or(z.literal('')) // 空文字列の許可
    .nullable()
    .optional()
    .transform((v) => (!v ? 'Task' : v)),
  topics: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  flags: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  fkw: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  prefs: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  url: z
    .string()
    .url('正しいURL形式で入力してください')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  parent_id: z.string().nullable().optional(),
});

// 作成時のスキーマ（IDなどはバックエンドで生成・付与するため基本スキーマを利用）
export const CreatePieceSchema = PieceSchema;

// 更新時のスキーマ（すべてのフィールドをオプショナルにする）
export const UpdatePieceSchema = PieceSchema.partial();

// DB用のスキーマ
export const DbPieceSchema = PieceSchema.omit({ source: true });

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type Piece = z.infer<typeof PieceSchema>;
export type DbPiece = z.infer<typeof DbPieceSchema>;
export type CreatePieceInput = z.infer<typeof CreatePieceSchema>;
export type UpdatePieceInput = z.infer<typeof UpdatePieceSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface LocalPiecesTable {
  id: Generated<string>;
  title: string;
  note: string;
  status: string;
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  fkw: string[];
  prefs: string[];
  url: string | null;
  start_date: ColumnType<string | null, string | null | undefined, string | null>;
  start_time: ColumnType<string | null, string | null | undefined, string | null>;
  end_date: ColumnType<string | null, string | null | undefined, string | null>;
  end_time: ColumnType<string | null, string | null | undefined, string | null>;
  parent_id: string | null;
  created_at: Generated<Date>;
}

export interface NotionPiecesCacheTable {
  id: string; // NotionのIDを指定するためGenerated不要
  title: string;
  note: string;
  status: string;
  area: string;
  type: string;
  topics: string[];
  flags: string[];
  fkw: string[];
  prefs: string[];
  start_date: ColumnType<string | null, string | null | undefined, string | null>;
  start_time: ColumnType<string | null, string | null | undefined, string | null>;
  end_date: ColumnType<string | null, string | null | undefined, string | null>;
  end_time: ColumnType<string | null, string | null | undefined, string | null>;
  url: string | null;
  parent_id: string | null;
  last_edited_time: Date;
  synced_at: Generated<Date>;
}
