import { Task } from "../schemas/task.schema";
import * as notionRepo from "../repositories/notion.repository";
import * as pgRepo from "../repositories/postgres.repository";

/**
 * タスクを作成し、適切に振り分ける
 */
export const createNewTask = async (task: Task) => {
  if (task.source === "NOTION") {
    // 1. Notionに作成
    const page = await notionRepo.createPage(task);
    // 2. 作成されたデータをローカルキャッシュに同期
    return await pgRepo.upsertNotionTaskCache(task, new Date(), page);
  } else {
    // ローカル専用タスクとして保存
    return await pgRepo.insertLocalTask(task);
  }
};

/**
 * キャッシュからタスク一覧を取得する（高速レスポンス用）
 */
export const getTasksFromCache = async () => {
  return await pgRepo.fetchCachedTasks();
};
