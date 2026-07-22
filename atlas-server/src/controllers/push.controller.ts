// src/controllers/push.controller.ts
import { Context } from 'hono';
import { PushNotificationInputSchema } from '../models/push.model';
import * as notificationService from '../services/notification.service';

// ==========================================
// 1. Webhook / External Integrations
// ==========================================

export const receivePush = async (c: Context) => {
  try {
    const body = await c.req.json();
    const result = PushNotificationInputSchema.safeParse(body);

    if (!result.success) {
      return c.json({ message: result.error.format() }, 400);
    }

    const data = await notificationService.handleExternalPush(result.data);
    return c.json({ status: 'ACCEPTED', data }, 202);
  } catch (error: any) {
    console.error('❌ Push Controller Error:', error);
    return c.json(
      { message: error.message || 'Failed to process push notification' },
      500,
    );
  }
};

// ==========================================
// 2. Notification Data Operations
// ==========================================

export const getNotificationHistory = async (c: Context) => {
  try {
    // URLクエリから文字列として取得
    const limitStr = c.req.query('limit');
    const offsetStr = c.req.query('offset');
    const isReadStr = c.req.query('isRead');

    // Serviceに渡すためのパラメータオブジェクトを作成
    const params = {
      limit: limitStr ? parseInt(limitStr, 10) : 50,
      offset: offsetStr ? parseInt(offsetStr, 10) : 0,
      isRead:
        isReadStr === 'true' ? true : isReadStr === 'false' ? false : undefined,
    };

    const notifications =
      await notificationService.getNotificationHistory(params);
    return c.json({ status: 'OK', notifications }, 200);
  } catch (error: any) {
    console.error('❌ Get Notification History Error:', error);
    return c.json(
      { message: error.message || 'Failed to retrieve notification history' },
      500,
    );
  }
};

export const markAsRead = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Notification ID is required' }, 400);

    const updatedNotification =
      await notificationService.markNotificationAsRead(id);

    if (!updatedNotification)
      return c.json({ message: 'Notification not found' }, 404);

    return c.json({ notification: updatedNotification }, 200);
  } catch (error: any) {
    console.error(`❌ Mark As Read Error (${c.req.param('id')}):`, error);
    return c.json(
      { message: error.message || 'Failed to mark notification as read' },
      500,
    );
  }
};

export const markAllAsRead = async (c: Context) => {
  try {
    await notificationService.markAllNotificationsAsRead();
    return c.json({ message: 'All notifications marked as read' }, 200);
  } catch (error: any) {
    console.error('❌ Mark All As Read Error:', error);
    return c.json(
      { message: error.message || 'Failed to mark all notifications as read' },
      500,
    );
  }
};
