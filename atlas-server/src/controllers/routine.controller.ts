// src/controllers/routine.controller.ts

import { Context } from 'hono';
import { z } from 'zod';
import * as routineService from '../services/routine.service';

/**
 * GET /api/v1/routines?frequency=weekly
 * ルーチンタスクの一覧を取得する
 */
export const getRoutines = async (c: Context) => {
  try {
    const frequency = c.req.query('frequency');
    const routines = await routineService.getRoutines(frequency);

    return c.json(routines, 200);
  } catch (error: any) {
    console.error('❌ Get Routines Error:', error);
    return c.json(
      { message: error.message || 'Failed to fetch routines' },
      500,
    );
  }
};

/**
 * POST /api/v1/routines
 * 新しいルーチンタスクを作成する
 */
export const createRoutine = async (c: Context) => {
  try {
    const body = await c.req.json();
    const newRoutine = await routineService.createRoutine(body);

    return c.json(newRoutine, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ message: 'Validation Error', errors: error.errors }, 400);
    }
    console.error('❌ Create Routine Error:', error);
    return c.json(
      { message: error.message || 'Failed to create routine' },
      500,
    );
  }
};

/**
 * DELETE /api/v1/routines/:id
 * ルーチンタスクを削除する
 */
export const deleteRoutine = async (c: Context) => {
  try {
    const idParam = c.req.param('id');
    const id = Number(idParam);

    if (!idParam || isNaN(id)) {
      return c.json({ message: 'Valid ID is required' }, 400);
    }

    const success = await routineService.deleteRoutine(id);
    if (!success) {
      return c.json({ message: 'Routine task not found' }, 404);
    }

    return c.json({ message: 'Routine deleted successfully', id }, 200);
  } catch (error: any) {
    console.error('❌ Delete Routine Error:', error);
    return c.json(
      { message: error.message || 'Failed to delete routine' },
      500,
    );
  }
};

/**
 * PATCH /api/v1/routines/:id
 * ルーチンタスクを更新する
 */
export const updateRoutine = async (c: Context) => {
  try {
    const idParam = c.req.param('id');
    const id = Number(idParam);

    if (!idParam || isNaN(id)) {
      return c.json({ message: 'Valid ID is required' }, 400);
    }

    const body = await c.req.json();
    const updatedRoutine = await routineService.updateRoutine(id, body);

    if (!updatedRoutine) {
      return c.json({ message: 'Routine task not found' }, 404);
    }

    return c.json(updatedRoutine, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ message: 'Validation Error', errors: error.errors }, 400);
    }
    console.error('❌ Update Routine Error:', error);
    return c.json(
      { message: error.message || 'Failed to update routine' },
      500,
    );
  }
};

/**
 * POST /api/v1/routines/generate
 * ルーチンを一括判定し、今週・来月分のタスクをインサートする
 */
export const generateRoutineTasks = async (c: Context) => {
  try {
    const result = await routineService.generateRoutineTasks();
    return c.json(result, 200);
  } catch (error: any) {
    console.error('❌ Generate Routines Error:', error);
    return c.json(
      { message: error.message || 'Failed to generate routine tasks' },
      500,
    );
  }
};
