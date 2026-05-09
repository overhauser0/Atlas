import { Context } from 'hono';
import { PushNotificationSchema } from '../schemas/push.schema';
import * as notificationService from '../services/notification.service';

export const receivePush = async (c: Context) => {
  const body = await c.req.json();
  const result = PushNotificationSchema.safeParse(body);

  if (!result.success) {
    return c.json({ message: result.error.format() }, 400);
  }

  try {
    const data = await notificationService.handleExternalPush(result.data);
    return c.json({ status: 'ACCEPTED', data }, 202);
  } catch (error: any) {
    console.error('❌ Push Controller Error:', error.message || error);
    return c.json({ message: error.message }, 500);
  }
};

export const getNotificationHistory = async (c: Context) => {
  try {
    return c.json({
      status: 'OK',
      notifications: await notificationService.getNotificationHistory(c),
    });
  } catch (error: any) {
    console.error(
      '❌ Notification History Controller Error:',
      error.message || error,
    );
    return c.json(
      { message: error.message || 'Failed to retrieve notification history' },
      500,
    );
  }
};

export const markAsRead = async (c: Context) => {
  const id = c.req.param('id');
  try {
    const updatedNotification =
      await notificationService.markNotificationAsRead(id);
    if (!updatedNotification) {
      return c.json({ message: 'Notification not found' }, 404);
    }

    return c.json({ notification: updatedNotification });
  } catch (error: any) {
    console.error('❌ Mark As Read Controller Error:', error.message || error);
    return c.json(
      { message: error.message || 'Failed to mark notification as read' },
      500,
    );
  }
};

export const markAllAsRead = async (c: Context) => {
  try {
    await notificationService.markAllNotificationsAsRead();
    return c.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error(
      '❌ Mark All As Read Controller Error:',
      error.message || error,
    );
    return c.json(
      { message: error.message || 'Failed to mark all notifications as read' },
      500,
    );
  }
};
