// atlas-server/src/controllers/notification.controller.ts

import { Context } from 'hono';
import { PushNotificationInputSchema } from '../models/push.model';
import * as notificationService from '../services/notification.service';

// ==========================================
// 1. Webhook / External Integrations
// ==========================================

export const receivePush = async (c: Context) => {
  const body = await c.req.json();
  const result = PushNotificationInputSchema.safeParse(body);

  if (!result.success) {
    return c.json({ message: result.error.format() }, 400);
  }

  const data = await notificationService.handleExternalPush(result.data);
  return c.json({ status: 'ACCEPTED', data }, 202);
};

// ==========================================
// 2. Notification Data Operations
// ==========================================

export const getNotificationHistory = async (c: Context) => {
  const limitStr = c.req.query('limit');
  const offsetStr = c.req.query('offset');
  const isReadStr = c.req.query('isRead');

  const limit = limitStr ? parseInt(limitStr, 10) : 50;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    return c.json({ message: 'Invalid limit or offset parameter' }, 400);
  }

  const params = {
    limit,
    offset,
    isRead:
      isReadStr === 'true' ? true : isReadStr === 'false' ? false : undefined,
  };

  const notifications =
    await notificationService.getNotificationHistory(params);
  return c.json({ status: 'OK', notifications }, 200);
};

export const markAsRead = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) return c.json({ message: 'Notification ID is required' }, 400);

  const updatedNotification =
    await notificationService.markNotificationAsRead(id);

  if (!updatedNotification)
    return c.json({ message: 'Notification not found' }, 404);

  return c.json({ notification: updatedNotification }, 200);
};

export const markAllAsRead = async (c: Context) => {
  await notificationService.markAllNotificationsAsRead();
  return c.json({ message: 'All notifications marked as read' }, 200);
};
