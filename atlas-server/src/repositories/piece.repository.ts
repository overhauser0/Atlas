// atlas-server/src/repositories/piece.repository.ts

import { db } from '../db/client';
import {
  UpdatePieceInput,
  DbPiece,
  LocalPiecesTable,
  NotionPiecesCacheTable,
} from '../models/piece.model';
import { Expression, Insertable, Selectable, sql, SqlBool, Updateable } from 'kysely';

export interface PieceFilters {
  area?: string;
  type?: string;
  status?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
  beforeDate?: string;
  afterDate?: string;
  parentId?: string;
}

type NotionPieceRow = Selectable<NotionPiecesCacheTable> & { source: 'NOTION' };
type LocalPieceRow = Selectable<LocalPiecesTable> & { source: 'LOCAL' };
export type CombinedPieceRow = NotionPieceRow | LocalPieceRow;

const buildPieceFilterConditions = (
  filters: PieceFilters,
): Expression<SqlBool>[] => {
  const conditions: Expression<SqlBool>[] = [];
  if (filters.area) conditions.push(sql<SqlBool>`area = ${filters.area}`);
  if (filters.type) conditions.push(sql<SqlBool>`type = ${filters.type}`);
  if (filters.status) conditions.push(sql<SqlBool>`status = ${filters.status}`);
  if (filters.flags && filters.flags.length > 0) {
    conditions.push(
      sql<SqlBool>`flags && ARRAY[${sql.join(filters.flags)}]::text[]`,
    );
  }
  if (filters.topics && filters.topics.length > 0) {
    conditions.push(
      sql<SqlBool>`topics && ARRAY[${sql.join(filters.topics)}]::text[]`,
    );
  }
  if (filters.excludeStatus && filters.excludeStatus.length > 0) {
    conditions.push(
      sql<SqlBool>`status NOT IN (${sql.join(filters.excludeStatus)})`,
    );
  }
  if (filters.beforeDate) {
    conditions.push(sql<SqlBool>`start_date < ${filters.beforeDate}`);
  }
  if (filters.afterDate) {
    conditions.push(sql<SqlBool>`start_date > ${filters.afterDate}`);
  }
  if (filters.parentId) {
    conditions.push(sql<SqlBool>`parent_id = ${filters.parentId}`);
  }
  return conditions;
};

const pickPieceTimestamp = (piece: CombinedPieceRow): number => {
  if (piece.start_date) {
    return new Date(
      `${piece.start_date}T${piece.start_time || '00:00:00'}`,
    ).getTime();
  }
  const fallback =
    piece.source === 'LOCAL' ? piece.created_at : piece.last_edited_time;
  return new Date(fallback).getTime();
};

/** 条件に一致する Piece を NotionキャッシュとローカルDBから取得する。 */
export const getPieces = async (
  filters: PieceFilters,
): Promise<CombinedPieceRow[]> => {
  const conditions = buildPieceFilterConditions(filters);

  let notionQuery = db.selectFrom('notion_pieces_cache').selectAll();
  let localQuery = db.selectFrom('local_pieces').selectAll();

  for (const condition of conditions) {
    notionQuery = notionQuery.where(condition);
    localQuery = localQuery.where(condition);
  }

  const [notionPieces, localPieces] = await Promise.all([
    notionQuery.execute(),
    localQuery.execute(),
  ]);

  const combined: CombinedPieceRow[] = [
    ...notionPieces.map((p) => ({ ...p, source: 'NOTION' as const })),
    ...localPieces.map((p) => ({ ...p, source: 'LOCAL' as const })),
  ];

  return combined.sort(
    (a, b) => pickPieceTimestamp(b) - pickPieceTimestamp(a),
  );
};

/** IDで Piece を取得する。 */
export const getPieceById = async (
  id: string,
): Promise<CombinedPieceRow | null> => {
  const local = await db
    .selectFrom('local_pieces')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (local) return { ...local, source: 'LOCAL' as const };

  const notion = await db
    .selectFrom('notion_pieces_cache')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (notion) return { ...notion, source: 'NOTION' as const };

  return null;
};

/** Notion由来の Piece キャッシュを追加または更新する。 */
export const upsertNotionPieceCache = async (
  piece: DbPiece,
  lastEditedTime: Date,
): Promise<NotionPieceRow | undefined> => {
  if (!piece.id) {
    throw new Error('Notion piece id is required for cache upsert');
  }

  const values: Insertable<NotionPiecesCacheTable> = {
    id: piece.id,
    title: piece.title,
    note: piece.note,
    status: piece.status,
    area: piece.area,
    type: piece.type,
    topics: piece.topics,
    flags: piece.flags,
    fkw: piece.fkw,
    prefs: piece.prefs,
    url: piece.url ?? null,
    start_date: piece.start_date ?? null,
    start_time: piece.start_time ?? null,
    end_date: piece.end_date ?? null,
    end_time: piece.end_time ?? null,
    parent_id: piece.parent_id ?? null,
    last_edited_time: lastEditedTime,
  };

  const upsertedPiece = await db
    .insertInto('notion_pieces_cache')
    .values(values)
    .onConflict((oc) => oc.column('id').doUpdateSet(values))
    .returningAll()
    .executeTakeFirst();

  return upsertedPiece
    ? { ...upsertedPiece, source: 'NOTION' as const }
    : undefined;
};

/** Notion由来の Piece キャッシュを更新する。 */
export const updateNotionPieceCache = async (
  id: string,
  updates: UpdatePieceInput,
): Promise<NotionPieceRow | undefined> => {
  const { source: _source, ...rest } = updates;
  const dbUpdates: Updateable<NotionPiecesCacheTable> = {
    ...rest,
    last_edited_time: new Date(),
  };

  const updatedPiece = await db
    .updateTable('notion_pieces_cache')
    .set(dbUpdates)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return updatedPiece
    ? { ...updatedPiece, source: 'NOTION' as const }
    : undefined;
};

/** 同期対象から外れた Notionキャッシュを削除する。 */
export const deleteStaleNotionCache = async (activeIds: string[]) => {
  if (activeIds.length === 0) return;
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', 'not in', activeIds)
    .execute();
};

/** Notion由来の Piece キャッシュを削除する。 */
export const deleteNotionPieceCache = async (id: string) => {
  return await db
    .deleteFrom('notion_pieces_cache')
    .where('id', '=', id)
    .executeTakeFirst();
};

/** ローカル Piece を作成する。 */
export const insertLocalPiece = async (
  dbPiece: DbPiece,
): Promise<LocalPieceRow | undefined> => {
  const insertedPiece = await db
    .insertInto('local_pieces')
    .values(dbPiece)
    .returningAll()
    .executeTakeFirst();

  return insertedPiece
    ? { ...insertedPiece, source: 'LOCAL' as const }
    : undefined;
};

/**
 * 複数のローカル Piece を一括で作成する。
 */
export const insertBatchLocalPieces = async (dbPieces: DbPiece[]) => {
  if (dbPieces.length === 0) return [];

  const insertedPieces = await db
    .insertInto('local_pieces')
    .values(dbPieces)
    .returningAll()
    .execute();

  return insertedPieces.map((piece) => ({
    ...piece,
    source: 'LOCAL' as const,
  }));
};

/** ローカル Piece を更新する。 */
export const updateLocalPiece = async (
  id: string,
  updates: UpdatePieceInput,
): Promise<LocalPieceRow | undefined> => {
  const { source: _source, ...rest } = updates;
  const updatedPiece = await db
    .updateTable('local_pieces')
    .set(rest)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return updatedPiece
    ? { ...updatedPiece, source: 'LOCAL' as const }
    : undefined;
};

/** ローカル Piece を削除する。 */
export const deleteLocalPiece = async (id: string) => {
  return await db
    .deleteFrom('local_pieces')
    .where('id', '=', id)
    .executeTakeFirst();
};

/** 60日より前に完了したローカル Piece を削除する。 */
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
    .where('start_date', 'is not', null)
    .where('start_date', '<', thresholdDateStr)
    .execute();
};

/**
 * 親が存在しない Piece のIDを取得する。
 */
export async function findOrphanedPieces(): Promise<{
  local: string[];
  notion: string[];
}> {
  const localOrphans = await db
    .selectFrom('local_pieces as child')
    .select('child.id')
    .where('child.parent_id', 'is not', null)
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('local_pieces as p1').where(
            sql`p1.id::text`,
            '=',
            sql`child.parent_id::text`,
          ),
        ),
      ),
    )
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('notion_pieces_cache as p2').where(
            sql`p2.id::text`,
            '=',
            sql`child.parent_id::text`,
          ),
        ),
      ),
    )
    .execute();

  const notionOrphans = await db
    .selectFrom('notion_pieces_cache as child')
    .select('child.id')
    .where('child.parent_id', 'is not', null)
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('local_pieces as p1').where(
            sql`p1.id::text`,
            '=',
            sql`child.parent_id::text`,
          ),
        ),
      ),
    )
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('notion_pieces_cache as p2').where(
            sql`p2.id::text`,
            '=',
            sql`child.parent_id::text`,
          ),
        ),
      ),
    )
    .execute();

  return {
    local: localOrphans.map((o) => o.id),
    notion: notionOrphans.map((o) => o.id),
  };
}

/**
 * 指定された Piece の parent_id をDB上で null にする。
 */
export async function clearParentIds(
  localIds: string[],
  notionIds: string[],
): Promise<void> {
  if (localIds.length > 0) {
    await db
      .updateTable('local_pieces')
      .set({ parent_id: null })
      .where('id', 'in', localIds)
      .execute();
  }

  if (notionIds.length > 0) {
    await db
      .updateTable('notion_pieces_cache')
      .set({ parent_id: null })
      .where('id', 'in', notionIds)
      .execute();
  }
}

/** 指定された親IDを参照する子 Piece の parent_id を新しいIDへ付け替える。 */
export async function rebindParentId(
  oldParentId: string,
  newParentId: string,
): Promise<{ localIds: string[]; notionIds: string[] }> {
  const updatedLocal = await db
    .updateTable('local_pieces')
    .set({ parent_id: newParentId })
    .where('parent_id', '=', oldParentId)
    .returning('id')
    .execute();

  const updatedNotion = await db
    .updateTable('notion_pieces_cache')
    .set({ parent_id: newParentId })
    .where('parent_id', '=', oldParentId)
    .returning('id')
    .execute();

  return {
    localIds: updatedLocal.map((row) => row.id),
    notionIds: updatedNotion.map((row) => row.id),
  };
}
