import { Generated, Selectable, Insertable, Updateable } from 'kysely';
import { z } from 'zod';

// Kysely DB Interface
export interface RoutineTaskTable {
  id: Generated<number>;
  title: string;
  frequency: 'weekly' | 'monthly';
  type: 'date' | 'nthWeekday' | null;
  day: number | null;
  week: number | null;
  day_of_week: number | null;
  note: string;
  url: string;
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type RoutineTask = Selectable<RoutineTaskTable>;
export type NewRoutineTask = Insertable<RoutineTaskTable>;
export type UpdateRoutineTask = Updateable<RoutineTaskTable>;

// Zod Schema
export const createRoutineSchema = z.object({
  title: z.string().min(1),
  frequency: z.enum(['weekly', 'monthly']),
  type: z.enum(['date', 'nthWeekday']).nullable().optional(),
  day: z.number().int().min(1).max(31).nullable().optional(),
  week: z.number().int().min(1).max(5).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  note: z.string().default(''),
  url: z.string().default(''),
  is_active: z.boolean().default(true),
});

export const updateRoutineSchema = createRoutineSchema.partial();

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;
