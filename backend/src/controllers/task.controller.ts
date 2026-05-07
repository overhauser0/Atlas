import { Context } from 'hono';
import * as taskService from '../services/task.service';
import * as syncService from '../services/sync.service';

export const getTasks = async (c: Context) => {
  // URLクエリから条件を取得
  const area = c.req.query('area');
  const type = c.req.query('type');
  const status = c.req.query('status');
  const excludeStatus = c.req.query('excludeStatus');

  const tasks = await taskService.getTasksFromCache({
    area,
    type,
    status,
    excludeStatus: excludeStatus ? excludeStatus.split(',') : undefined,
  });

  return c.json({
    success: true,
    tasks: tasks || [],
  });
};

export const syncTasks = async (c: Context) => {
  try {
    const result = await syncService.syncNotionToLocal();
    return c.json({ status: 'SYNC_SUCCESS', ...result });
  } catch (error: any) {
    console.error('❌ Sync Task Error:', error.message || error);
    return c.json(
      {
        status: 'SYNC_FAILED',
        message: error.message || 'Unknown error',
      },
      500,
    );
  }
};

export const updateTask = async (c: Context) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const updatedTask = await taskService.updateTask(id, body);
    // 成功時はラップして返す
    return c.json({
      success: true,
      task: updatedTask,
    });
  } catch (error: any) {
    console.error('Task Update Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
};

export const createNewTask = async (c: Context) => {
  const body = await c.req.json();
  try {
    const newTask = await taskService.createNewTask(body);
    return c.json({ success: true, task: newTask });
  } catch (error: any) {
    console.error('Task Creation Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
};
