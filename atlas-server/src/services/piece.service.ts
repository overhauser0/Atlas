import { Piece, PieceSchema, DbPieceSchema } from '../schemas/piece.schema';
import * as notionRepo from '../repositories/notion.repository';
import * as postgresRepo from '../repositories/postgres.repository';
import { syncNotionToLocal } from './sync.service';
import { broadcast } from '../utils/websocket';

/**
 * Pieceを作成し、適切に振り分ける
 */
export const createNewPiece = async (piece: Piece) => {
  const targetSource = piece.source;

  const validatedPiece = DbPieceSchema.parse(piece);
  if (targetSource === 'NOTION') {
    // 1. Notionに作成
    const page = await notionRepo.insertPiecePage(validatedPiece);
    // 2. 作成されたデータをローカルキャッシュに同期
    validatedPiece.id = page.id;

    const result = await postgresRepo.upsertNotionPieceCache(
      validatedPiece,
      new Date(),
      page,
    );
    broadcast('REFRESH_PIECES');
    return result;
  } else {
    // ローカル専用タスクとして保存
    const result = await postgresRepo.insertLocalPiece(validatedPiece);
    broadcast('REFRESH_PIECES');
    return result;
  }
};

export const getPiecesFromCache = async (filters: {
  area?: string;
  status?: string;
  type?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
  beforeDate?: string;
  afterDate?: string;
}) => {
  // 古いローカルタスクは削除する 廃止検討中
  // await postgresRepo.deleteOldDoneLocalPieces();

  return await postgresRepo.getPieces(filters);
};

export const updatePiece = async (id: string, payload: Partial<Piece>) => {
  const targetSource = payload.source;

  const dbUpdates = DbPieceSchema.partial().parse(payload);

  if (targetSource === 'NOTION') {
    await notionRepo.updatePiecePage(id, dbUpdates);
    const result = await postgresRepo.updateNotionPieceCache(id, dbUpdates);
    broadcast('REFRESH_PIECES');
    return result;
  } else if (targetSource === 'LOCAL') {
    const result = await postgresRepo.updateLocalPiece(id, dbUpdates);
    broadcast('REFRESH_PIECES');
    return result;
  } else {
    throw new Error('Source (NOTION or LOCAL) is required to update a piece');
  }
};

export const getPieceBlocks = async (id: string) => {
  return await notionRepo.getPageBlocks(id);
};

export const deletePiece = async (id: string) => {
  // sourceの判定
  const piece = await postgresRepo.getPieceById(id);

  if (!piece) {
    throw new Error(`Piece with id ${id} not found`);
  }

  // sourceによって処理の分岐
  if (piece.source === 'NOTION') {
    await notionRepo.archivePiecePage(id);

    await postgresRepo.deleteNotionPieceCache(id);
  } else if (piece.source === 'LOCAL') {
    await postgresRepo.deleteLocalPiece(id);
  }

  return { success: true, id, source: piece.source };
};

export const getPieceById = async (id: string) => {
  return await postgresRepo.getPieceById(id);
};

export const rescheduleOverduePiecesToToday = async () => {
  await syncNotionToLocal();

  const todayStr = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
    .format(new Date())
    .replace(/\//g, '-');

  const overduePieces = await postgresRepo.getPieces({
    area: 'Work',
    excludeStatus: ['Done', 'Canceled'],
    beforeDate: todayStr,
  });

  const updatedPieces = [];
  for (const piece of overduePieces) {
    try {
      if (piece.source === 'NOTION') {
        await notionRepo.updatePiecePage(piece.id, { date: todayStr });
        const updated = await postgresRepo.updateNotionPieceCache(piece.id, {
          date: todayStr,
        });
        if (updated) updatedPieces.push(updated);
      } else if (piece.source === 'LOCAL') {
        const updated = await postgresRepo.updateLocalPiece(piece.id, {
          date: todayStr,
        });
        if (updated) updatedPieces.push(updated);
      }
    } catch (error) {
      console.error(`Error updating piece ${piece.id}:`, error);
    }
  }
  broadcast('REFRESH_PIECES');
  return updatedPieces;
};
