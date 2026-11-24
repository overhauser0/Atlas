// atlas-server/src/controllers/calendar.controller.ts

import { Context } from 'hono';
import * as calendarRepo from '../repositories/calendar.repository';
import { broadcast } from '../utils/websocket';
import { GoogleEventSchema } from '../models/calendar.model';

// ==========================================
// Webhook from n8n
// ==========================================

export const receiveCalendarSync = async (c: Context) => {
  const body = await c.req.json();

  // n8nから送られてきた配列データを取得
  const events = Array.isArray(body) ? body : body.cache_data;

  if (!events || !Array.isArray(events)) {
    return c.json(
      { message: 'Invalid data format. Expected an array of events.' },
      400,
    );
  }

  const validation = GoogleEventSchema.array().safeParse(events);
  if (!validation.success) {
    return c.json(
      {
        message: 'Invalid Google Calendar event data.',
        errors: validation.error.format(),
      },
      400,
    );
  }

  await calendarRepo.syncGoogleEvents(validation.data);
  broadcast(JSON.stringify({ type: 'REFRESH_CALENDAR' }));

  console.log(
    `✅ Synced ${validation.data.length} Google Calendar events from n8n.`,
  );
  return c.json({ status: 'SUCCESS', count: validation.data.length }, 200);
};

// ==========================================
// API for Frontend
// ==========================================

export const getEvents = async (c: Context) => {
  const events = await calendarRepo.getGoogleEvents();
  return c.json({ status: 'OK', events }, 200);
};
