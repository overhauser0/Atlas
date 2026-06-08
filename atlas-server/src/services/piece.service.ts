import { Piece, PieceSchema } from '../schemas/piece.schema';
import * as notionRepo from '../repositories/notion.repository';
import * as postgresRepo from '../repositories/postgres.repository';
import { syncNotionToLocal } from './sync.service';

/**
 * Pieceを作成し、適切に振り分ける
 */
export const createNewPiece = async (piece: Piece) => {
  const validatedPiece = PieceSchema.parse(piece);
  if (validatedPiece.source === 'NOTION') {
    // 1. Notionに作成
    const page = await notionRepo.insertPiecePage(validatedPiece);
    // 2. 作成されたデータをローカルキャッシュに同期
    validatedPiece.id = page.id;

    return await postgresRepo.upsertNotionPieceCache(
      validatedPiece,
      new Date(),
      page,
    );
  } else {
    // ローカル専用タスクとして保存
    return await postgresRepo.insertLocalPiece(validatedPiece);
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

export const updatePiece = async (id: string, payload: any) => {
  const { source, ...rest } = payload;

  // DB用のオブジェクトに変換
  const updates: any = {
    ...rest,
  };

  if (source === 'NOTION') {
    // 1. Notion 側を更新
    await notionRepo.updatePiecePage(id, updates);

    // 2. Postgres のキャッシュを更新
    return await postgresRepo.updateNotionPieceCache(id, updates);
  } else {
    // ローカルPieceのみ更新
    return await postgresRepo.updateLocalPiece(id, updates);
  }
};

export const getPieceBlocks = async (id: string) => {
  return await notionRepo.getPageBlocks(id);
};

export const deletePiece = async (id: string) => {
  // 1. タスクがどちらのSourceか特定する
  const piece = await postgresRepo.getPieceById(id);

  if (!piece) {
    throw new Error(`Piece with id ${id} not found`);
  }

  // 2. Sourceに応じて削除処理を分岐
  if (piece.source === 'NOTION') {
    // Notion側をアーカイブ
    await notionRepo.archivePiecePage(id);
    // ローカルキャッシュを削除
    await postgresRepo.deleteNotionPieceCache(id);
  } else if (piece.source === 'LOCAL') {
    // ローカルテーブルから削除
    await postgresRepo.deleteLocalPiece(id);
  }

  return { success: true, id, source: piece.source };
};

export const getPieceById = async (id: string) => {
  return await postgresRepo.getPieceById(id);
};

export const rescheduleOverduePiecesToToday = async () => {
  await syncNotionToLocal();
  const todayStr = new Date().toISOString().split('T')[0];

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
  return updatedPieces;
};
