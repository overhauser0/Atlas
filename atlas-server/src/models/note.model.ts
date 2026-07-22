import { z } from 'zod';
import { Generated, Selectable, Insertable, Updateable } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

export const LocalNoteSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  content: z.string().default(''),
  url: z.string().default(''),
  is_pinned: z.boolean().default(false),
});

export const CreateLocalNoteSchema = LocalNoteSchema;
export const UpdateLocalNoteSchema = LocalNoteSchema.partial();

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type LocalNote = z.infer<typeof LocalNoteSchema>;
export type CreateLocalNoteInput = z.infer<typeof CreateLocalNoteSchema>;
export type UpdateLocalNoteInput = z.infer<typeof UpdateLocalNoteSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface LocalNotesTable {
  id: Generated<string>;
  title: string;
  content: string;
  url: string;
  is_pinned: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type LocalNoteRow = Selectable<LocalNotesTable>;
export type NewLocalNoteRow = Insertable<LocalNotesTable>;
export type LocalNoteUpdateRow = Updateable<LocalNotesTable>;
