import { db } from '../db/client';
import {
  CreatePieceInput,
  UpdatePieceInput,
  DbPiece,
} from '../models/piece.model';

export interface PieceFilters {
  area?: string;
  type?: string;
  status?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
  beforeDate?: string;
  afterDate?: string;
}

export const getPieces = async (filters: PieceFilters) => {
  const applyCommonFilters = (qb: any) => {
    let q = qb;
    if (filters.area) q = q.where('area', '=', filters.area);
    if (filters.type) q = q.where('type', '=', filters.type);
    if (filters.status) q = q.where('status', '=', filters.status);
    if (filters.flags && filters.flags.length > 0) {
      q = q.where('flags', 'in', filters.flags);
    }
    if (filters.topics && filters.topics.length > 0) {
      q = q.where('topics', 'in', filters.topics);
    }
    if (filters.excludeStatus && filters.excludeStatus.length > 0) {
      q = q.where('status', 'not in', filters.excludeStatus);
    }
    if (filters.beforeDate) {
      q = q.where('date', '<', filters.beforeDate);
    }
    if (filters.afterDate) {
      q = q.where('date', '>', filters.afterDate);
    }
    return q;
  };

  const notionPieces = await applyCommonFilters(
    db.selectFrom('notion_pieces_cache').selectAll(),
  ).execute();

  const localPieces = await applyCommonFilters(
    db.selectFrom('local_pieces').selectAll(),
  ).execute();

  const mapPiece = (p: any, source: 'NOTION' | 'LOCAL') => ({
    ...p,
    source,
  });

  const combined = [
    ...notionPieces.map((p: any) => mapPiece(p, 'NOTION')),
    ...localPieces.map((p: any) => mapPiece(p, 'LOCAL')),
  ];

  const pickDate = (piece: any) => {
    return new Date(
      piece.date || piece.created_at || piece.last_edited_time,
    ).getTime();
  };

  return combined.sort((a, b) => pickDate(b) - pickDate(a));
};

export const getPieceById = async (id: string) => {
  const local = await db
    .selectFrom('local_pieces')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (local) return { ...local, source: 'LOCAL' };

  const notion = await db
    .selectFrom('notion_pieces_cache')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (notion) return { ...notion, source: 'NOTION' };

  return null;
};

export const upsertNotionPieceCache = async (
  piece: DbPiece,
  lastEditedTime: Date,
) => {
  const values = {
    ...piece,
    last_edited_time: lastEditedTime,
  };

  const upsertedPiece = await db
    .insertInto('notion_pieces_cache')
    .values(values as any)
    .onConflict((oc) => oc.column('id').doUpdateSet(values as any))
    .returningAll()
    .executeTakeFirst();

  if (upsertedPiece) (upsertedPiece as any).source = 'NOTION';
  return upsertedPiece;
};

export const updateNotionPieceCache = async (
  id: string,
  updates: UpdatePieceInput,
) => {
  const dbUpdates = {
    ...updates,
    last_edited_time: new Date(),
  };

  const updatedPiece = await db
    .updateTable('notion_pieces_cache')
    .set(dbUpdates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedPiece) (updatedPiece as any).source = 'NOTION';
  return updatedPiece;
};

export const deleteStaleNotionCache = async (activeIds: string[]) => {
  if (activeIds.length === 0) return;
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', 'not in', activeIds)
    .execute();
};

export const deleteNotionPieceCache = async (id: string) => {
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', '=', id)
    .executeTakeFirst();
};

export const insertLocalPiece = async (dbPiece: CreatePieceInput) => {
  const insertedPiece = await db
    .insertInto('local_pieces')
    .values(dbPiece as any)
    .returningAll()
    .executeTakeFirst();

  if (insertedPiece) (insertedPiece as any).source = 'LOCAL';
  return insertedPiece;
};

export const updateLocalPiece = async (
  id: string,
  updates: UpdatePieceInput,
) => {
  const updatedPiece = await db
    .updateTable('local_pieces')
    .set(updates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  if (updatedPiece) (updatedPiece as any).source = 'LOCAL';
  return updatedPiece;
};

export const deleteLocalPiece = async (id: string) => {
  return await db
    .deleteFrom('local_pieces')
    .where('id', '=', id)
    .executeTakeFirst();
};

export const deleteOldDoneLocalPieces = async () => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - 60);

  const thresholdDateStr = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
    .format(thresholdDate)
    .replace(/\//g, '-');

  return await db
    .deleteFrom('local_pieces')
    .where('status', '=', 'Done')
    .where('date', 'is not', null)
    .where('date', '<', thresholdDateStr)
    .execute();
};
