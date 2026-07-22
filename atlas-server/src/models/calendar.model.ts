import { z } from 'zod';
import { Generated, Selectable, Insertable, Updateable } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

export const GoogleEventSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  title: z.string().min(1, 'タイトルは必須です'),
  note: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export const CreateGoogleEventSchema = GoogleEventSchema;
export const UpdateGoogleEventSchema = GoogleEventSchema.partial();

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type GoogleEvent = z.infer<typeof GoogleEventSchema>;
export type CreateGoogleEventInput = z.infer<typeof CreateGoogleEventSchema>;
export type UpdateGoogleEventInput = z.infer<typeof UpdateGoogleEventSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface DbGoogleEvent {
  id: string;
  title: string;
  note: string | null;
  date: string | null;
  url: string | null;
  synced_at: Generated<Date>;
}

// リポジトリ層で利用する便利な型（Kyselyでの型推論に活用）
export type GoogleEventRow = Selectable<DbGoogleEvent>;
export type NewGoogleEventRow = Insertable<DbGoogleEvent>;
export type GoogleEventUpdateRow = Updateable<DbGoogleEvent>;
