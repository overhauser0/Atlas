import { PushNotification } from '../schemas/push.schema';
import { Task } from '../schemas/task.schema';
import * as pgRepo from '../repositories/postgres.repository';
import * as taskService from './task.service';

/**
 * 外部（n8n等）からのプッシュイベントを処理する
 */
export const handleExternalPush = async (data: PushNotification) => {
  // 時刻込みのフルタイムスタンプ（DBの更新日時用）
  const todayIso = new Date().toISOString();

  // JSTでの正しい「今日」の日付（YYYY-MM-DD形式）※スウェーデンを使ったハック
  const todayDate = new Date().toLocaleDateString('sv-SE');

  // 1. 通知履歴としてアーカイブ
  const archived = await pgRepo.archiveNotification(data);

  let taskResult = null;
  // 2. Notionへのタスク化ロジック
  if (data.storageTarget === 'NOTION') {
    const taskData: Task = {
      id: data.id || crypto.randomUUID(),
      title: data.title,
      content: data.content,
      status: 'INBOX',
      priority: data.priority,
      source: 'NOTION',
      area: 'Work',
      type: 'Task',
      topics: data.metadata?.topics || [],
      flags: data.metadata?.flags || [],
      dueDate: data.date || todayDate,
      last_edited_time: todayIso,
      synced_at: todayIso,
    };
    taskResult = await taskService.createNewTask(taskData);
  }

  return { archived, taskResult };
};

export const getNotificationHistory = async (c: any) => {
  return await pgRepo.getNotifications();
};

export const markNotificationAsRead = async (id: string) => {
  return await pgRepo.markAsRead(id);
};
export const markAllNotificationsAsRead = async () => {
  return await pgRepo.markAllAsRead();
};
