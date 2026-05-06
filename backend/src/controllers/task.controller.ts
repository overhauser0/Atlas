import { Context } from "hono";
import * as taskService from "../services/task.service";
import * as syncService from "../services/sync.service";

export const getTasks = async (c: Context) => {
  const tasks = await taskService.getTasksFromCache();
  return c.json(tasks);
};

export const syncTasks = async (c: Context) => {
  try {
    const result = await syncService.syncNotionToLocal();
    return c.json({ status: "SYNC_SUCCESS", ...result });
  } catch (error: any) {
    console.error("❌ Sync Task Error:", error.message || error);
    return c.json(
      {
        status: "SYNC_FAILED",
        message: error.message || "Unknown error",
      },
      500,
    );
  }
};
