import {
  Piece,
  CreatePieceSchema,
  UpdatePieceSchema,
  dbPieceSchema,
} from '../models/piece.model';
import * as notionRepo from '../repositories/notion.repository';
import * as pieceRepo from '../repositories/piece.repository';
import { syncNotionToLocal } from './sync.service';
import { broadcast } from '../utils/websocket';

/**
 * Pieceを作成し、適切に振り分ける
 */
export const createNewPiece = async (piece: Piece) => {
  const targetSource = piece.source;

  const validatedPiece = CreatePieceSchema.parse(piece);
  if (targetSource === 'NOTION') {
    // 1. Notionに作成
    const page = await notionRepo.insertPiecePage(validatedPiece);
    // 2. 作成されたデータをローカルキャッシュに同期
    validatedPiece.id = page.id;

    const result = await pieceRepo.upsertNotionPieceCache(
      validatedPiece,
      new Date(),
    );
    broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
    return result;
  } else {
    // ローカル専用タスクとして保存
    const result = await pieceRepo.insertLocalPiece(validatedPiece);
    broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
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
  return await pieceRepo.getPieces(filters);
};

export const updatePiece = async (id: string, payload: Partial<Piece>) => {
  const targetSource = payload.source;

  const dbUpdates = dbPieceSchema.partial().parse(payload);

  let result = null;

  if (targetSource === 'NOTION') {
    await notionRepo.updatePiecePage(id, dbUpdates);
    result = await pieceRepo.updateNotionPieceCache(id, dbUpdates);
  } else if (targetSource === 'LOCAL') {
    result = await pieceRepo.updateLocalPiece(id, dbUpdates);
  } else {
    throw new Error('Source (NOTION or LOCAL) is required to update a piece');
  }

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return result;
};

export const getPieceBlocks = async (id: string) => {
  return await notionRepo.getPageBlocks(id);
};

export const deletePiece = async (id: string) => {
  // sourceの判定
  const piece = await pieceRepo.getPieceById(id);

  if (!piece) {
    throw new Error(`Piece with id ${id} not found`);
  }

  // sourceによって処理の分岐
  if (piece.source === 'NOTION') {
    await notionRepo.archivePiecePage(id);

    await pieceRepo.deleteNotionPieceCache(id);
  } else if (piece.source === 'LOCAL') {
    await pieceRepo.deleteLocalPiece(id);
  }

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return { success: true, id, source: piece.source };
};

export const getPieceById = async (id: string) => {
  return await pieceRepo.getPieceById(id);
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

  const overduePieces = await pieceRepo.getPieces({
    area: 'Work',
    excludeStatus: ['Done', 'Canceled'],
    beforeDate: todayStr,
  });

  const updatedPieces = [];
  for (const piece of overduePieces) {
    try {
      if (piece.source === 'NOTION') {
        await notionRepo.updatePiecePage(piece.id, { date: todayStr });
        const updated = await pieceRepo.updateNotionPieceCache(piece.id, {
          date: todayStr,
        });
        if (updated) updatedPieces.push(updated);
      } else if (piece.source === 'LOCAL') {
        const updated = await pieceRepo.updateLocalPiece(piece.id, {
          date: todayStr,
        });
        if (updated) updatedPieces.push(updated);
      }
    } catch (error) {
      console.error(`Error updating piece ${piece.id}:`, error);
    }
  }
  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return updatedPieces;
};
