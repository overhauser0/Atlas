import { db } from '../db/client';

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

export const getGoogleEvents = async () => {
  return await db
    .selectFrom('google_events')
    .selectAll()
    .orderBy('date', 'asc')
    .execute();
};

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
