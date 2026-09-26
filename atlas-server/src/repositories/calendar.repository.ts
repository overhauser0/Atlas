// atlas-server/src/repositories/calendar.repository.ts

import { db } from '../db/client';

/** Google Calendarのイベントを取得する。 */
export const getGoogleEvents = async () => {
  return await db
    .selectFrom('google_events')
    .selectAll()
    .orderBy('date', 'asc')
    .execute();
};

/** Google Calendarのイベントを追加または更新する。 */
export const upsertGoogleEvents = async (events: any[]) => {
  if (!events || events.length === 0) return;

  const values = events.map((event) => ({
    id: event.id,
    title: event.title,
    note: event.note || '',
    date: event.date,
    url: event.url || '',
    synced_at: new Date(),
  }));

  await db
    .insertInto('google_events')
    .values(values as any)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        title: eb.ref('excluded.title'),
        note: eb.ref('excluded.note'),
        date: eb.ref('excluded.date'),
        url: eb.ref('excluded.url'),
        synced_at: eb.ref('excluded.synced_at'),
      })),
    )
    .execute();
};

/** Google Calendarのイベントを同期し、不要なイベントを削除する。 */
export const syncGoogleEvents = async (events: any[]) => {
  if (!events || events.length === 0) {
    return;
  }

  const values = events.map((event) => ({
    id: event.id,
    title: event.title,
    note: event.note || '',
    date: event.date,
    url: event.url || '',
    synced_at: new Date(),
  }));

  await db
    .insertInto('google_events')
    .values(values as any)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        title: eb.ref('excluded.title'),
        note: eb.ref('excluded.note'),
        date: eb.ref('excluded.date'),
        url: eb.ref('excluded.url'),
        synced_at: eb.ref('excluded.synced_at'),
      })),
    )
    .execute();

  const activeIds = events.map((e) => e.id);

  if (activeIds.length > 0) {
    await db
      .deleteFrom('google_events')
      .where('id', 'not in', activeIds)
      .execute();
  }
};
