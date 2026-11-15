import { z } from 'zod';
import { Generated, Insertable, Selectable, Updateable } from 'kysely';

const isValidDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export const DiaryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付は yyyy-mm-dd 形式で指定してください')
  .refine(isValidDate, '有効な日付を指定してください');

export const DiaryRangeQuerySchema = z
  .object({
    startDate: DiaryDateSchema.optional(),
    endDate: DiaryDateSchema.optional(),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || startDate <= endDate,
    {
      message: 'startDate は endDate 以前の日付を指定してください',
      path: ['startDate'],
    },
  );

export type DiaryRangeQuery = z.infer<typeof DiaryRangeQuerySchema>;

const DiaryFieldsSchema = z.object({
  rate: z.number().int().min(1).max(5).nullable(),
  content: z.string(),
  flag: z.boolean(),
  piece_ids: z.array(z.string().uuid()),
});

export const CreateDiarySchema = z.object({
  date: DiaryDateSchema,
  rate: z.number().int().min(1).max(5).nullable().optional().default(null),
  content: z.string().optional().default(''),
  flag: z.boolean().optional().default(false),
  piece_ids: z.array(z.string().uuid()).optional().default([]),
});

export const UpdateDiarySchema = DiaryFieldsSchema.partial();

export type Diary = z.infer<typeof CreateDiarySchema> & { id: string };
export type CreateDiaryInput = z.infer<typeof CreateDiarySchema>;
export type UpdateDiaryInput = z.infer<typeof UpdateDiarySchema>;

export interface DiaryTable {
  id: Generated<string>;
  date: string;
  rate: number | null;
  content: string;
  flag: boolean | null;
  piece_ids: string[];
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type DiaryRow = Selectable<DiaryTable>;
export type NewDiaryRow = Insertable<DiaryTable>;
export type DiaryUpdateRow = Updateable<DiaryTable>;
