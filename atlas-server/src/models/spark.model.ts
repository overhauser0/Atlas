import { z } from 'zod';
import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

const SparkDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '対象日は yyyy-mm-dd 形式で指定してください')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, '有効な対象日を指定してください');

export const SparkSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1, '内容は必須です'),
  recorded_at: z.union([z.date(), z.string().datetime({ offset: true })]),
  target_date: SparkDateSchema,
  discord_message_id: z.string().nullable().optional(),
  consumed_at: z.date().nullable().optional(),
  created_at: z.date().optional(),
});

export const SparkIdSchema = z.string().uuid();

export const SparkTargetDateQuerySchema = z.object({
  targetDate: SparkDateSchema.optional(),
});

// 新規作成用（target_date は省略時にサーバー側で recorded_at から自動算出可能にする）
export const SparkInputSchema = SparkSchema.omit({
  id: true,
  consumed_at: true,
  created_at: true,
}).extend({
  target_date: SparkDateSchema.optional(),
});

export const UpdateSparkSchema = SparkInputSchema.partial();

// 一括消化用（Diaryの「すべて追記」ボタン用）
export const ConsumeSparksBulkSchema = z.object({
  ids: z.array(SparkIdSchema).min(1, '消化対象のIDを1つ以上指定してください'),
});

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type Spark = z.infer<typeof SparkSchema>;
export type SparkInput = z.infer<typeof SparkInputSchema>;
export type SparkTargetDateQuery = z.infer<typeof SparkTargetDateQuerySchema>;
export type UpdateSparkInput = z.infer<typeof UpdateSparkSchema>;
export type ConsumeSparksBulkInput = z.infer<typeof ConsumeSparksBulkSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface SparksTable {
  id: Generated<string>;
  content: string;
  recorded_at: ColumnType<Date, Date | string, Date | string>;
  target_date: string;
  discord_message_id: string | null;
  consumed_at: Date | null;
  created_at: Generated<Date>;
}

export type SparkRow = Selectable<SparksTable>;
export type NewSparkRow = Insertable<SparksTable>;
export type SparkUpdateRow = Updateable<SparksTable>;
