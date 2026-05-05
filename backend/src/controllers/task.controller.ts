import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import * as syncService from "../services/sync.service";

export const getTasks = async (_req: Request, res: Response) => {
  const tasks = await taskService.getTasksFromCache();
  res.json(tasks);
};

export const syncTasks = async (_req: Request, res: Response) => {
  try {
    const result = await syncService.syncNotionToLocal();
    res.json({ status: "SYNC_SUCCESS", ...result });
  } catch (error) {
    res.status(500).json({ status: "SYNC_FAILED" });
  }
};
