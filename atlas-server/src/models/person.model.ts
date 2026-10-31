import { z } from 'zod';
import { Generated, Insertable, Selectable, Updateable } from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

export const PersonSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '名前は必須です'),
  ruby: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  immich_person_id: z.string().nullable().optional(),
  google_contact_id: z.string().nullable().optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '誕生日は yyyy-mm-dd 形式で指定してください')
    .nullable()
    .optional(),
  blood_type: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const PersonIdSchema = z.string().uuid();

export const PersonInputSchema = PersonSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdatePersonSchema = PersonInputSchema.partial();

const PersonPieceBaseSchema = z.object({
  id: z.string().uuid().optional(),
  person_id: z.string().uuid(),
  notion_piece_id: z.string().min(1).max(255).nullable().optional(),
  local_piece_id: z.string().uuid().nullable().optional(),
  created_at: z.date().optional(),
});

const hasExactlyOnePiece = ({
  notion_piece_id,
  local_piece_id,
}: {
  notion_piece_id?: string | null;
  local_piece_id?: string | null;
}) => (notion_piece_id != null) !== (local_piece_id != null);

export const PersonPieceSchema = PersonPieceBaseSchema.refine(
  hasExactlyOnePiece,
  {
    message: 'NotionまたはLocalのPiece IDを一方だけ指定してください',
  },
);

export const PersonPieceInputSchema = PersonPieceBaseSchema.omit({
  id: true,
  created_at: true,
}).refine(
  hasExactlyOnePiece,
  {
    message: 'NotionまたはLocalのPiece IDを一方だけ指定してください',
  },
);

export const PersonPieceTargetInputSchema = PersonPieceBaseSchema.omit({
  id: true,
  person_id: true,
  created_at: true,
}).refine(hasExactlyOnePiece, {
  message: 'NotionまたはLocalのPiece IDを一方だけ指定してください',
});

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type Person = z.infer<typeof PersonSchema>;
export type PersonInput = z.infer<typeof PersonInputSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type PersonPiece = z.infer<typeof PersonPieceSchema>;
export type PersonPieceInput = z.infer<typeof PersonPieceInputSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface PeopleTable {
  id: Generated<string>;
  name: string;
  ruby: string | null;
  tags: string[] | null;
  immich_person_id: string | null;
  google_contact_id: string | null;
  birthday: string | null;
  blood_type: string[] | null;
  notes: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PersonPiecesTable {
  id: Generated<string>;
  person_id: string;
  notion_piece_id: string | null;
  local_piece_id: string | null;
  created_at: Generated<Date>;
}

export type PersonRow = Selectable<PeopleTable>;
export type NewPersonRow = Insertable<PeopleTable>;
export type PersonUpdateRow = Updateable<PeopleTable>;

export type PersonPieceRow = Selectable<PersonPiecesTable>;
export type NewPersonPieceRow = Insertable<PersonPiecesTable>;
export type PersonPieceUpdateRow = Updateable<PersonPiecesTable>;
