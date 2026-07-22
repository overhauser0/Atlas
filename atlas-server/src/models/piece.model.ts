import { z } from 'zod';
import { Generated } from 'kysely';

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
    .transform((v) => (!v ? 'INBOX' : v)),
  source: z
    .enum(['NOTION', 'LOCAL'])
    .or(z.literal(''))
    .nullable()
    .transform((v) => (!v ? 'LOCAL' : v)),
  date: z
    .union([
      z.string().datetime({ offset: true }), // Notionはオフセット(+09:00等)を返すことがあるため offset: true がおすすめ
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ])
    .nullable()
    .optional(),
  area: z
    .enum(['Work', 'Life'])
    .or(z.literal(''))
    .nullable()
    .optional()
    .transform((v) => (!v ? 'Work' : v)),
  type: z
    .enum(['Task', 'Note', 'Event'])
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
});

// 作成時のスキーマ（IDなどはバックエンドで生成・付与するため基本スキーマを利用）
export const CreatePieceSchema = PieceSchema;

// 更新時のスキーマ（すべてのフィールドをオプショナルにする）
export const UpdatePieceSchema = PieceSchema.partial();

// DB用のスキーマ
export const dbPieceSchema = PieceSchema.omit({ source: true });

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type Piece = z.infer<typeof PieceSchema>;
export type DbPiece = z.infer<typeof dbPieceSchema>;
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
  date: string | null;
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
  date: Date | null;
  url: string | null;
  last_edited_time: Date;
  synced_at: Generated<Date>;
}
