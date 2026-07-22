import { z } from 'zod';
import { Generated, Insertable, Selectable, Updateable } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

export const AiAgentSchema = z.object({
  id: z.string().min(1, 'IDは必須です'),
  name: z.string().min(1, '名前は必須です'),
  system_prompt: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

// 作成用（ID指定必須）
export const CreateAiAgentSchema = AiAgentSchema;

// 更新用（ID以外の項目をオプショナルに）
export const UpdateAiAgentSchema = AiAgentSchema.omit({ id: true }).partial();

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type AiAgentInput = z.infer<typeof AiAgentSchema>;
export type CreateAiAgentInput = z.infer<typeof CreateAiAgentSchema>;
export type UpdateAiAgentInput = z.infer<typeof UpdateAiAgentSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface AiAgentsTable {
  id: string;
  name: string;
  system_prompt: string | null;
  sort_order: Generated<number>;
  created_at: Generated<Date>;
}

// Kyselyの便利な型ヘルパーを展開しておく（リポジトリ層で活用）
export type AiAgentRow = Selectable<AiAgentsTable>;
export type NewAiAgentRow = Insertable<AiAgentsTable>;
export type AiAgentUpdateRow = Updateable<AiAgentsTable>;
