// atlas-server/src/controllers/calendar.controller.ts

import { Context } from 'hono';
import * as pgRepo from '../repositories/postgres.repository';
import { broadcast } from '../utils/websocket';

// ==========================================
// Webhook from n8n
// ==========================================

export const receiveCalendarSync = async (c: Context) => {
  try {
    const body = await c.req.json();

    // n8nから送られてきた配列データを取得
    const events = Array.isArray(body) ? body : body.cache_data;

    if (!events || !Array.isArray(events)) {
      return c.json(
        { message: 'Invalid data format. Expected an array of events.' },
        400,
      );
    }

    // DBにUpsert
    await pgRepo.syncGoogleEvents(events);

    // WebSocketでフロントエンドに変更を通知
    broadcast(JSON.stringify({ type: 'REFRESH_CALENDAR' }));

    console.log(`✅ Synced ${events.length} Google Calendar events from n8n.`);
    return c.json({ status: 'SUCCESS', count: events.length }, 200);
  } catch (error: any) {
    console.error('❌ Receive Calendar Sync Error:', error);
    return c.json(
      { message: error.message || 'Failed to process calendar sync' },
      500,
    );
  }
};

// ==========================================
// API for Frontend
// ==========================================

export const getEvents = async (c: Context) => {
  try {
    const events = await pgRepo.getGoogleEvents();
    return c.json({ status: 'OK', events }, 200);
  } catch (error: any) {
    console.error('❌ Get Events Error:', error);
    return c.json(
      { message: error.message || 'Failed to retrieve events' },
      500,
    );
  }
};
