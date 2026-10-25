import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { z } from 'zod';

const TaskStatusSchema = z.enum([
  'INBOX',
  'Waiting',
  'Going',
  'Wrapper',
  'Canceled',
  'Done',
]);

const TaskPresetChildInputSchema = z.object({
  title_suffix: z.string().min(1),
  offset_days: z.number().int().min(-2147483648).max(2147483647),
  default_status: TaskStatusSchema.nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const CreateTaskPresetSchema = z.object({
  label: z.string().min(1).max(100),
  title_prefix: z.string().max(200).nullable().optional(),
  description: z.string().nullable().optional(),
  children: z.array(TaskPresetChildInputSchema).default([]),
});

export const UpdateTaskPresetSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  title_prefix: z.string().max(200).nullable().optional(),
  description: z.string().nullable().optional(),
  children: z.array(TaskPresetChildInputSchema).optional(),
});

export const ApplyTaskPresetSchema = z.object({
  presetId: z.string().min(1),
  baseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateTaskPresetInput = z.infer<typeof CreateTaskPresetSchema>;
export type UpdateTaskPresetInput = z.infer<typeof UpdateTaskPresetSchema>;
export type ApplyTaskPresetInput = z.infer<typeof ApplyTaskPresetSchema>;

export interface TaskPresetTable {
  id: string;
  label: string;
  title_prefix: string | null;
  description: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface TaskPresetChildTable {
  id: string;
  preset_id: string;
  title_suffix: string;
  offset_days: number;
  default_status: string | null;
  sort_order: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type TaskPreset = Selectable<TaskPresetTable>;
export type NewTaskPreset = Insertable<TaskPresetTable>;
export type UpdateTaskPreset = Updateable<TaskPresetTable>;
export type TaskPresetChild = Selectable<TaskPresetChildTable>;
export type NewTaskPresetChild = Insertable<TaskPresetChildTable>;
