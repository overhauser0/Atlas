import { Task } from '../schemas/task.schema';
import * as notionRepo from '../repositories/notion.repository';
import * as pgRepo from '../repositories/postgres.repository';

/**
 * タスクを作成し、適切に振り分ける
 */
export const createNewTask = async (task: Task) => {
  if (task.source === 'NOTION') {
    // 1. Notionに作成
    const page = await notionRepo.createPage(task);
    // 2. 作成されたデータをローカルキャッシュに同期
    task.id = page.id; // NotionのIDをタスクにセット

    return await pgRepo.upsertNotionTaskCache(task, new Date(), page);
  } else {
    // ローカル専用タスクとして保存
    return await pgRepo.insertLocalTask(task);
  }
};

export const getTasksFromCache = async (filters: {
  area?: string;
  status?: string;
  type?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
}) => {
  // 古いローカルタスクは削除する
  await pgRepo.cleanupOldDoneLocalTasks();

  return await pgRepo.getTasks(filters);
};

export const updateTask = async (id: string, payload: any) => {
  const { source, ...rest } = payload;

  // DB用のオブジェクトに変換
  const updates: any = {
    ...rest,
  };

  if (source === 'NOTION') {
    // 1. Notion 側を更新
    await notionRepo.updatePage(id, updates);

    // 2. Postgres のキャッシュを更新
    return await pgRepo.updateNotionTaskCache(id, updates);
  } else {
    // ローカルタスクのみ更新
    return await pgRepo.updateLocalTask(id, updates);
  }
};
