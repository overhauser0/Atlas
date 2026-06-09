import { z } from 'zod';

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
    .nullable()
    .transform((v) => v ?? 'INBOX'),
  source: z
    .enum(['NOTION', 'LOCAL'])
    .nullable()
    .transform((v) => v ?? 'LOCAL'),
  date: z
    .union([
      z.string().datetime({ offset: true }), // Notionはオフセット(+09:00等)を返すことがあるため offset: true がおすすめ
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ])
    .nullable()
    .optional(),
  area: z
    .enum(['Work', 'Life'])
    .nullable()
    .optional()
    .transform((v) => v ?? 'Work'),
  type: z
    .enum(['Task', 'Note', 'Event'])
    .nullable()
    .optional()
    .transform((v) => v ?? 'Task'),
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

export const DbPieceSchema = PieceSchema.omit({ source: true });

export type Piece = z.infer<typeof PieceSchema>;
export type DbPiece = z.infer<typeof DbPieceSchema>;
