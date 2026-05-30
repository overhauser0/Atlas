import { z } from 'zod';

export const PieceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'タイトルは必須です'),
  note: z.string().default(''),
  status: z
    .enum(['INBOX', 'Waiting', 'Going', 'Wrapper', 'Canceled', 'Done'])
    .default('INBOX'),
  source: z.enum(['NOTION', 'LOCAL']).default('LOCAL'),
  date: z
    .union([
      z.string().datetime({ offset: true }), // Notionはオフセット(+09:00等)を返すことがあるため offset: true がおすすめ
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ])
    .nullable()
    .optional(),
  area: z.enum(['Work', 'Life']).default('Work'),
  type: z.enum(['Task', 'Note', 'Event']).default('Task'),
  topics: z.array(z.string()).default([]),
  flags: z.array(z.string()).default([]),
  fkw: z.array(z.string()).default([]).optional(),
  prefs: z.array(z.string()).default([]).optional(),
  url: z.string().url().nullable().optional(),
});

export type Piece = z.infer<typeof PieceSchema>;
