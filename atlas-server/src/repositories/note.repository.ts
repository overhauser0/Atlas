import { db } from '../db/client';

export const getLocalNotes = async () => {
  return await db
    .selectFrom('local_notes')
    .selectAll()
    .orderBy('is_pinned', 'desc')
    .orderBy('updated_at', 'desc')
    .execute();
};

export const createLocalNote = async (data: {
  title: string;
  content?: string;
  url?: string;
}) => {
  return await db
    .insertInto('local_notes')
    .values({
      title: data.title,
      content: data.content || '',
      url: data.url || '',
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const updateLocalNote = async (
  id: string,
  data: Partial<{
    title: string;
    content: string;
    url: string;
    is_pinned: boolean;
  }>,
) => {
  return await db
    .updateTable('local_notes')
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const deleteLocalNote = async (id: string) => {
  return await db
    .deleteFrom('local_notes')
    .where('id', '=', id)
    .returning('id')
    .executeTakeFirstOrThrow();
};
