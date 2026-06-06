import { Piece } from '../schemas/piece.schema';
import * as notionRepo from '../repositories/notion.repository';
import * as pgRepo from '../repositories/postgres.repository';

/**
 * Pieceを作成し、適切に振り分ける
 */
export const createNewPiece = async (piece: Piece) => {
  if (piece.source === 'NOTION') {
    // 1. Notionに作成
    const page = await notionRepo.insertPiecePage(piece);
    // 2. 作成されたデータをローカルキャッシュに同期
    piece.id = page.id;

    return await pgRepo.upsertNotionPieceCache(piece, new Date(), page);
  } else {
    // ローカル専用タスクとして保存
    return await pgRepo.insertLocalPiece(piece);
  }
};

export const getPiecesFromCache = async (filters: {
  area?: string;
  status?: string;
  type?: string;
  flags?: string[];
  topics?: string[];
  excludeStatus?: string[];
}) => {
  // 古いローカルタスクは削除する
  await pgRepo.deleteOldDoneLocalPieces();

  return await pgRepo.getPieces(filters);
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
    return await pgRepo.updateNotionPieceCache(id, updates);
  } else {
    // ローカルPieceのみ更新
    return await pgRepo.updateLocalPiece(id, updates);
  }
};

export const getPieceBlocks = async (id: string) => {
  return await notionRepo.getPageBlocks(id);
};
