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
