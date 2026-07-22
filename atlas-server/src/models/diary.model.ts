import { z } from 'zod';
import { Generated, Selectable, Insertable, Updateable } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
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

export const CreateDiarySchema = DiarySchema;
export const UpdateDiarySchema = DiarySchema.partial();

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type Diary = z.infer<typeof DiarySchema>;
export type CreateDiaryInput = z.infer<typeof CreateDiarySchema>;
export type UpdateDiaryInput = z.infer<typeof UpdateDiarySchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface DiaryTable {
  id: string;
  name: string;
  date: string | null;
  rate: string | null;
  note: string | null;
  last_edited_time: string;
}

// リポジトリ層で利用する便利な型
export type DiaryRow = Selectable<DiaryTable>;
export type NewDiaryRow = Insertable<DiaryTable>;
export type DiaryUpdateRow = Updateable<DiaryTable>;
