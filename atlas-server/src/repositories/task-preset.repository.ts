import { db } from '../db/client';
import {
  NewTaskPreset,
  NewTaskPresetChild,
  TaskPreset,
  TaskPresetChild,
  UpdateTaskPreset,
} from '../models/task-preset.model';

export type TaskPresetWithChildren = TaskPreset & {
  children: TaskPresetChild[];
};

const getChildrenByPresetIds = async (presetIds: string[]) => {
  if (presetIds.length === 0) return [];
  return await db
    .selectFrom('task_preset_children')
    .selectAll()
    .where('preset_id', 'in', presetIds)
    .orderBy('sort_order', 'asc')
    .orderBy('id', 'asc')
    .execute();
};

export const getAllTaskPresets = async (): Promise<TaskPresetWithChildren[]> => {
  const presets = await db
    .selectFrom('task_presets')
    .selectAll()
    .orderBy('label', 'asc')
    .execute();
  const children = await getChildrenByPresetIds(presets.map(({ id }) => id));
  const childrenByPreset = new Map<string, TaskPresetChild[]>();

  for (const child of children) {
    const presetChildren = childrenByPreset.get(child.preset_id) || [];
    presetChildren.push(child);
    childrenByPreset.set(child.preset_id, presetChildren);
  }

  return presets.map((preset) => ({
    ...preset,
    children: childrenByPreset.get(preset.id) || [],
  }));
};

export const getTaskPresetById = async (
  id: string,
): Promise<TaskPresetWithChildren | undefined> => {
  const preset = await db
    .selectFrom('task_presets')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (!preset) return undefined;

  const children = await getChildrenByPresetIds([id]);
  return { ...preset, children };
};

export const createTaskPreset = async (
  preset: NewTaskPreset,
  children: NewTaskPresetChild[],
): Promise<TaskPresetWithChildren> => {
  const id = preset.id;
  await db.transaction().execute(async (trx) => {
    await trx.insertInto('task_presets').values(preset).execute();
    if (children.length > 0) {
      await trx.insertInto('task_preset_children').values(children).execute();
    }
  });

  const created = await getTaskPresetById(id);
  if (!created) throw new Error('Created task preset could not be retrieved');
  return created;
};

export const updateTaskPreset = async (
  id: string,
  updates: UpdateTaskPreset,
  children?: NewTaskPresetChild[],
): Promise<TaskPresetWithChildren | undefined> => {
  const updated = await db.transaction().execute(async (trx) => {
    const preset = await trx
      .updateTable('task_presets')
      .set({ ...updates, updated_at: new Date() })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirst();
    if (!preset) return false;

    if (children !== undefined) {
      await trx
        .deleteFrom('task_preset_children')
        .where('preset_id', '=', id)
        .execute();
      if (children.length > 0) {
        await trx.insertInto('task_preset_children').values(children).execute();
      }
    }
    return true;
  });

  return updated ? await getTaskPresetById(id) : undefined;
};

export const deleteTaskPreset = async (id: string): Promise<boolean> => {
  const result = await db
    .deleteFrom('task_presets')
    .where('id', '=', id)
    .executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
};

export const insertPresetPieces = async (
  pieces: {
    title: string;
    note: string;
    status: string;
    area: string;
    type: string;
    topics: string[];
    flags: string[];
    fkw: string[];
    prefs: string[];
    url: string | null;
    date: string;
    parent_id: string;
  }[],
) => {
  if (pieces.length === 0) return [];
  return await db
    .insertInto('local_pieces')
    .values(pieces)
    .returningAll()
    .execute();
};
