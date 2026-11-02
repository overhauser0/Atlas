// atlas-server/src/repositories/calendar.repository.ts

import { db } from '../db/client';
import { GoogleEvent } from '../models/calendar.model';

/** Google Calendarのイベントを取得する。 */
export const getGoogleEvents = async () => {
  return await db
    .selectFrom('google_events')
    .selectAll()
    .orderBy('start_date', 'asc')
    .orderBy('start_time', 'asc')
    .execute();
};

/** Google Calendarのイベントを追加または更新する。 */
export const upsertGoogleEvents = async (events: GoogleEvent[]) => {
  if (!events || events.length === 0) return;

  await writeGoogleEvents(events);
};

/** Google Calendarのイベントを同期し、不要なイベントを削除する。 */
export const syncGoogleEvents = async (events: GoogleEvent[]) => {
  if (!events || events.length === 0) {
    return;
  }

  await writeGoogleEvents(events);

  const activeIds = events.map((e) => e.id);

  if (activeIds.length > 0) {
    await db
      .deleteFrom('google_events')
      .where('id', 'not in', activeIds)
      .execute();
  }
};

const writeGoogleEvents = async (events: GoogleEvent[]) => {
  const values = events.map((event) => ({
    id: event.id,
    title: event.title,
    note: event.note || '',
    start_date: event.start_date,
    start_time: event.start_time,
    end_date: event.end_date,
    end_time: event.end_time,
    url: event.url || '',
    synced_at: new Date(),
  }));

  await db
    .insertInto('google_events')
    .values(values)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        title: eb.ref('excluded.title'),
        note: eb.ref('excluded.note'),
        start_date: eb.ref('excluded.start_date'),
        start_time: eb.ref('excluded.start_time'),
        end_date: eb.ref('excluded.end_date'),
        end_time: eb.ref('excluded.end_time'),
        url: eb.ref('excluded.url'),
        synced_at: eb.ref('excluded.synced_at'),
      })),
    )
    .execute();
};
