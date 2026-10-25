import { randomUUID } from 'node:crypto';
import * as pieceRepository from '../repositories/piece.repository';
import * as taskPresetRepository from '../repositories/task-preset.repository';
import {
  ApplyTaskPresetSchema,
  CreateTaskPresetSchema,
  UpdateTaskPresetSchema,
} from '../models/task-preset.model';
import { broadcast } from '../utils/websocket';

export class TaskPresetError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 404,
    message: string,
  ) {
    super(message);
    this.name = 'TaskPresetError';
  }
}

const makeChildren = (
  presetId: string,
  children: {
    title_suffix: string;
    offset_days: number;
    default_status?: string | null;
    sort_order?: number;
  }[],
) =>
  children.map((child, index) => ({
    id: randomUUID(),
    preset_id: presetId,
    title_suffix: child.title_suffix,
    offset_days: child.offset_days,
    default_status: child.default_status ?? null,
    sort_order: child.sort_order ?? index,
  }));

export const getTaskPresets = async () =>
  await taskPresetRepository.getAllTaskPresets();

export const getTaskPreset = async (id: string) => {
  const preset = await taskPresetRepository.getTaskPresetById(id);
  if (!preset) {
    throw new TaskPresetError(
      'TASK_PRESET_NOT_FOUND',
      404,
      'Task preset was not found.',
    );
  }
  return preset;
};

export const createTaskPreset = async (input: unknown) => {
  const data = CreateTaskPresetSchema.parse(input);
  const id = randomUUID();
  return await taskPresetRepository.createTaskPreset(
    {
      id,
      label: data.label,
      title_prefix: data.title_prefix ?? null,
      description: data.description ?? null,
    },
    makeChildren(id, data.children),
  );
};

export const updateTaskPreset = async (id: string, input: unknown) => {
  const data = UpdateTaskPresetSchema.parse(input);
  const { children, ...updates } = data;
  const preset = await taskPresetRepository.updateTaskPreset(
    id,
    updates,
    children === undefined ? undefined : makeChildren(id, children),
  );
  if (!preset) {
    throw new TaskPresetError(
      'TASK_PRESET_NOT_FOUND',
      404,
      'Task preset was not found.',
    );
  }
  return preset;
};

export const deleteTaskPreset = async (id: string) => {
  const deleted = await taskPresetRepository.deleteTaskPreset(id);
  if (!deleted) {
    throw new TaskPresetError(
      'TASK_PRESET_NOT_FOUND',
      404,
      'Task preset was not found.',
    );
  }
};

const parseCalendarDate = (value: string): Date | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10) === value ? date : undefined;
};

export const applyTaskPreset = async (parentId: string, input: unknown) => {
  const data = ApplyTaskPresetSchema.parse(input);
  const parent = await pieceRepository.getPieceById(parentId);
  if (!parent) {
    throw new TaskPresetError(
      'PARENT_TASK_NOT_FOUND',
      404,
      'Parent task was not found.',
    );
  }

  const preset = await taskPresetRepository.getTaskPresetById(data.presetId);
  if (!preset) {
    throw new TaskPresetError(
      'TASK_PRESET_NOT_FOUND',
      404,
      'Task preset was not found.',
    );
  }

  const parentDate =
    parent.date instanceof Date
      ? parent.date.toISOString().slice(0, 10)
      : typeof parent.date === 'string'
        ? parent.date.slice(0, 10)
        : '';
  const baseDateValue = data.baseDate || parentDate;
  const baseDate = baseDateValue
    ? parseCalendarDate(baseDateValue)
    : undefined;
  if (!baseDate) {
    throw new TaskPresetError(
      'BASE_DATE_REQUIRED',
      400,
      'A valid base date is required.',
    );
  }

  const pieces = preset.children.map((child) => {
    const dueDate = new Date(baseDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + child.offset_days);
    if (Number.isNaN(dueDate.getTime())) {
      throw new TaskPresetError(
        'INVALID_TASK_DATE',
        400,
        'A preset task date is out of range.',
      );
    }
    const title = `${preset.title_prefix || ''}${child.title_suffix}`;
    if (title.length === 0) {
      throw new TaskPresetError(
        'TASK_TITLE_REQUIRED',
        400,
        'Preset child task title cannot be empty.',
      );
    }
    return {
      title,
      note: '',
      status: child.default_status || 'INBOX',
      area: parent.area,
      type: 'Task',
      topics: [],
      flags: [],
      fkw: [],
      prefs: [],
      url: null,
      date: dueDate.toISOString().slice(0, 10),
      parent_id: parentId,
    };
  });

  const createdPieces = await taskPresetRepository.insertPresetPieces(pieces);
  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return { created_count: createdPieces.length, created_tasks: createdPieces };
};
