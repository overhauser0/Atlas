// atlas-server/src/controllers/error.controller.ts

import { Context } from 'hono';
import * as notificationService from '../services/notification.service';

export const handleServerError = async (error: Error, c: Context) => {
  if (error instanceof SyntaxError) {
    return c.json(
      {
        success: false,
        error: 'Invalid JSON payload',
        message: 'Invalid JSON payload',
      },
      400,
    );
  }

  console.error(`[Server Error] ${c.req.method} ${c.req.path}:`, error);

  try {
    await notificationService.archiveServerError(error);
  } catch (archiveError) {
    console.warn('Failed to archive error notification', archiveError);
  }

  return c.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
    },
    500,
  );
};
