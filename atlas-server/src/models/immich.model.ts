// src/models/immich.model.ts

import { z } from 'zod';
import { ColumnType, Generated } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

// ストレージ情報のスキーマ
export const ImmichStorageSchema = z.object({
  usedBytes: z.number(),
  usedGb: z.number(),
});

export const ImmichItemCountSchema = z.object({
  name: z.string(),
  count: z.number(),
});

// Immichの統計データ本体のスキーマ（JSONBとしてDBに保存される中身）
export const ImmichStatsDataSchema = z.object({
  total: z.number(),
  images: z.number(),
  videos: z.number(),
  storage: ImmichStorageSchema,
  topMakes: z.array(ImmichItemCountSchema),
  topModels: z.array(ImmichItemCountSchema),
  topLenses: z.array(ImmichItemCountSchema),
  topFocalLengths: z.array(ImmichItemCountSchema),
  topStates: z.array(ImmichItemCountSchema),
  dailyCounts: z.record(z.string(), z.number()).optional(),
  syncedAt: z.string().optional(),
});

// キャッシュレコードのスキーマ
export const ImmichCacheSchema = z.object({
  id: z.number().optional(),
  key: z.string().min(1),
  data: ImmichStatsDataSchema,
  updated_at: z.date().optional(),
});

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type ImmichStorage = z.infer<typeof ImmichStorageSchema>;
export type ImmichStatsData = z.infer<typeof ImmichStatsDataSchema>;
export type ImmichCache = z.infer<typeof ImmichCacheSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface ImmichCacheTable {
  id: Generated<number>;
  key: string;
  data: ColumnType<ImmichStatsData | string, string, string>; // PostgreSQLの JSONB カラム用（中身は ImmichStatsData）
  updated_at: Generated<Date>;
}
