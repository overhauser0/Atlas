import { Context } from 'hono';
import { ZodError } from 'zod';
import * as taskPresetService from '../services/task-preset.service';

const handleError = (error: unknown, c: Context) => {
  if (error instanceof taskPresetService.TaskPresetError) {
    return c.json(
      {
        success: false,
        code: error.code,
        message: error.message,
      },
      error.status,
    );
  }
  if (error instanceof ZodError) {
    return c.json(
      {
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Invalid request.',
      },
      400,
    );
  }
  if (error instanceof SyntaxError) {
    return c.json(
      {
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Invalid request.',
      },
      400,
    );
  }
  console.error('[Task Preset Controller] Request failed:', error);
  return c.json(
    {
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to process task preset request.',
    },
    500,
  );
};

export const getTaskPresets = async (c: Context) => {
  try {
    return c.json({ presets: await taskPresetService.getTaskPresets() }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const getTaskPreset = async (c: Context) => {
  try {
    return c.json(
      { preset: await taskPresetService.getTaskPreset(c.req.param('id') || '') },
      200,
    );
  } catch (error) {
    return handleError(error, c);
  }
};

export const createTaskPreset = async (c: Context) => {
  try {
    const preset = await taskPresetService.createTaskPreset(await c.req.json());
    return c.json({ preset }, 201);
  } catch (error) {
    return handleError(error, c);
  }
};

export const updateTaskPreset = async (c: Context) => {
  try {
    const preset = await taskPresetService.updateTaskPreset(
      c.req.param('id') || '',
      await c.req.json(),
    );
    return c.json({ preset }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const deleteTaskPreset = async (c: Context) => {
  try {
    await taskPresetService.deleteTaskPreset(c.req.param('id') || '');
    return c.json({ success: true }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const applyTaskPreset = async (c: Context) => {
  try {
    const result = await taskPresetService.applyTaskPreset(
      c.req.param('id') || '',
      await c.req.json(),
    );
    return c.json(result, 201);
  } catch (error) {
    return handleError(error, c);
  }
};
