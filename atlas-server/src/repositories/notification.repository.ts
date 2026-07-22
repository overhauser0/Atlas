import { db } from '../db/client';
import { PushNotificationInput } from '../models/push.model';

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

export const getNotifications = async (
  limit = 50,
  offset = 1,
  isRead = false,
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

export const markNotificationAsRead = async (id: string) => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

export const markAllNotificationsAsRead = async () => {
  return await db
    .updateTable('notifications')
    .set({ is_read: true })
    .where('is_read', '=', false)
    .execute();
};
