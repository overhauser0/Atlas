import { PushNotification } from "../schemas/push.schema";
import { Task } from "../schemas/task.schema";
import * as pgRepo from "../repositories/postgres.repository";
import * as taskService from "./task.service";

/**
 * 外部（n8n等）からのプッシュイベントを処理する
 */
export const handleExternalPush = async (data: PushNotification) => {
  const today = new Date().toISOString();
  // 1. 通知履歴としてアーカイブ
  const archived = await pgRepo.archiveNotification(data);

  let taskResult = null;
  // 2. NotionまたはLocalへのタスク化ロジック
  if (data.storageTarget === "NOTION" || data.storageTarget === "BOTH") {
    const taskData: Task = {
      id: data.id || crypto.randomUUID(),
      title: data.title,
      content: data.content,
      status: "INBOX",
      priority: data.priority,
      source: "NOTION",
      area: "Work",
      type: "Task",
      topics: data.metadata?.topics || [],
      flags: data.metadata?.flags || [],
      due_date: data.date || today,
      last_edited_time: today,
      synced_at: today,
    };
    taskResult = await taskService.createNewTask(taskData);
  }

  return { archived, taskResult };
};
