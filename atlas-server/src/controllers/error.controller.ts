import { Context } from 'hono';
import * as notificationService from '../services/notification.service';

export const handleServerError = async (error: Error, c: Context) => {
  console.warn(`[Server Error]: ${error.message}`);

  try {
    await notificationService.archiveServerError(error);
  } catch (archiveError) {
    console.warn('Failed to archive error notification', archiveError);
  }

  return c.json({ success: false, error: 'Internal Server Error' }, 500);
};
