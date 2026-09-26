// atlas-server/src/repositories/notification.repository.ts

import { db } from '../db/client';
import { PushNotificationInput } from '../models/push.model';

/** 通知履歴を取得する。 */
export const getNotifications = async (
  limit = 50,
  offset = 1,
  isRead?: boolean,
) => {
  let query = db.selectFrom('notifications').selectAll();

  if (isRead !== undefined) {
    query = query.where('is_read', '=', isRead);
  }

  return await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();
};

/** 通知を作成する。 */
export const insertNotification = async (data: PushNotificationInput) => {
  return await db
    .insertInto('notifications')
    .values({
      title: data.title,
      note: data.note || '',
      url: data.url || '',
      category: data.category || 'INFO',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      is_read: false,
    })
    .returningAll()
    .executeTakeFirst();
};

/** 指定した通知を既読にする。 */
export const markNotificationAsRead = async (id: string) => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

/** 未読通知をすべて既読にする。 */
export const markAllNotificationsAsRead = async () => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('is_read', '=', false)
    .execute();
};
