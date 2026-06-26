import { z } from 'zod';
import { Generated } from 'kysely';

// ==========================================
// 1. Zod Schema
// ==========================================

export const DiarySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .optional()
    .transform((v) => v ?? 'No Title'), // yyyy-mm-dd
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付は yyyy-mm-dd 形式で指定してください')
    .nullable()
    .optional(),
  rate: z
    .enum(['★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'])
    .nullable()
    .optional(),
  note: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? ''),
});

// データベース挿入用の型（IDはあってもなくても良い場合や、クライアントから来ない場合を想定）
export const DbDiarySchema = DiarySchema;

// ==========================================
// 2. Types
// ==========================================

export type Diary = z.infer<typeof DiarySchema>;
export type DbDiary = z.infer<typeof DbDiarySchema>;

// Notionから取得した時の生データ型
export interface NotionDiaryItem {
  id: string;
  name: string;
  date: string | null;
  rate: string | null;
  note: string | null;
  last_edited_time: string;
}

// Kysely テーブル定義用
export interface DiaryTable {
  id: string;
  name: string;
  date: string | null;
  rate: string | null;
  note: string | null;
  last_edited_time: Date;
  synced_at: Generated<Date>;
}
