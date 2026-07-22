import { z } from 'zod';
import { Generated, Selectable, Insertable, Updateable } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

export const AppMetadataSchema = z.object({
  key: z.string().min(1, 'キーは必須です'),
  value: z.string(),
});

export const UpsertAppMetadataSchema = AppMetadataSchema;

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type AppMetadata = z.infer<typeof AppMetadataSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface AppMetadataTable {
  key: string; // キー自体が主キー
  value: string;
  updated_at: Generated<Date>;
}

export type AppMetadataRow = Selectable<AppMetadataTable>;
export type NewAppMetadataRow = Insertable<AppMetadataTable>;
export type AppMetadataUpdateRow = Updateable<AppMetadataTable>;
