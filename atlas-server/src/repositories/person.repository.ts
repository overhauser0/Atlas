import { db } from '../db/client';
import {
  PersonInput,
  PersonPieceInput,
  UpdatePersonInput,
} from '../models/person.model';

export const getPeople = async () =>
  await db.selectFrom('people').selectAll().orderBy('name', 'asc').execute();

export const getPersonById = async (id: string) =>
  await db
    .selectFrom('people')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

export const createPerson = async (data: PersonInput) =>
  await db
    .insertInto('people')
    .values({
      name: data.name,
      ruby: data.ruby ?? null,
      tags: data.tags ?? null,
      immich_person_id: data.immich_person_id ?? null,
      google_contact_id: data.google_contact_id ?? null,
      birthday: data.birthday ?? null,
      blood_type: data.blood_type ?? null,
      notes: data.notes ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

export const updatePerson = async (id: string, data: UpdatePersonInput) =>
  await db
    .updateTable('people')
    .set({ ...data, updated_at: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

export const deletePerson = async (id: string) => {
  const result = await db
    .deleteFrom('people')
    .where('id', '=', id)
    .returning('id')
    .executeTakeFirst();
  return result !== undefined;
};

export const getPersonPieces = async (personId: string) =>
  await db
    .selectFrom('person_pieces')
    .selectAll()
    .where('person_id', '=', personId)
    .orderBy('created_at', 'asc')
    .execute();

export const getPersonPieceById = async (personId: string, id: string) =>
  await db
    .selectFrom('person_pieces')
    .selectAll()
    .where('person_id', '=', personId)
    .where('id', '=', id)
    .executeTakeFirst();

export const createPersonPiece = async (data: PersonPieceInput) =>
  await db
    .insertInto('person_pieces')
    .values({
      person_id: data.person_id,
      notion_piece_id: data.notion_piece_id ?? null,
      local_piece_id: data.local_piece_id ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

export const updatePersonPiece = async (
  personId: string,
  id: string,
  data: Pick<PersonPieceInput, 'notion_piece_id' | 'local_piece_id'>,
) =>
  await db
    .updateTable('person_pieces')
    .set({
      notion_piece_id: data.notion_piece_id ?? null,
      local_piece_id: data.local_piece_id ?? null,
    })
    .where('person_id', '=', personId)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

export const deletePersonPiece = async (personId: string, id: string) => {
  const result = await db
    .deleteFrom('person_pieces')
    .where('person_id', '=', personId)
    .where('id', '=', id)
    .returning('id')
    .executeTakeFirst();
  return result !== undefined;
};
