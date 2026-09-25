import { Piece, DbPiece, DbPieceSchema } from '../models/piece.model';
import * as notionRepository from '../repositories/notion.repository';
import * as pieceRepository from '../repositories/piece.repository';
import * as notificationServive from './notification.service';
import { syncNotionToLocal } from './sync.service';
import { broadcast } from '../utils/websocket';

/**
 * Pieceを作成し、適切に振り分ける
 */
export const createNewPiece = async (piece: Piece) => {
  const { source, ...dbPiece } = piece;

  if (source === 'NOTION') {
    // 1. Notionに作成
    const page = await notionRepository.insertPiecePage(dbPiece);
    // 2. 作成されたデータをローカルキャッシュに同期
    dbPiece.id = page.id;

    const result = await pieceRepository.upsertNotionPieceCache(
      dbPiece,
      new Date(),
    );
    broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
    return result;
  } else {
    // ローカル専用タスクとして保存
    const result = await pieceRepository.insertLocalPiece(dbPiece);
    broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
    return result;
  }
};

/**
 * 複数のタスク（Piece）を一括生成する
 */
export const createPiecesBulk = async (pieces: Piece[]) => {
  if (!pieces || pieces.length === 0) {
    return [];
  }

  // DbPiece 型に合わせてオブジェクトを生成
  const piecesToCreate: Partial<DbPiece>[] = pieces.map((piece) => ({
    title: piece.title,
    area: piece.area || 'Work',
    date: piece.date || new Date().toISOString().split('T')[0],
    note: '',
    url: '',
    parent_id: piece.parent_id || null,
    type: piece.type || ('Task' as const),
    status: piece.status || ('INBOX' as const),
  }));

  // バッチ挿入を実行
  const insertedPieces = await pieceRepository.insertBatchLocalPieces(
    piecesToCreate as DbPiece[],
  );

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));

  return insertedPieces;
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
  parentId?: string;
}) => {
  return await pieceRepository.getPieces(filters);
};

export const updatePiece = async (id: string, payload: Partial<Piece>) => {
  const exitPiece = await getPieceById(id);

  const targetSource = payload.source || exitPiece?.source;

  const dbUpdates = DbPieceSchema.partial().parse(payload);

  let result = null;

  if (targetSource === 'NOTION') {
    await notionRepository.updatePiecePage(id, dbUpdates);
    result = await pieceRepository.updateNotionPieceCache(id, dbUpdates);
  } else if (targetSource === 'LOCAL') {
    result = await pieceRepository.updateLocalPiece(id, dbUpdates);
  } else {
    throw new Error('Source (NOTION or LOCAL) is required to update a piece');
  }

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return result;
};

export const getPieceBlocks = async (id: string) => {
  return await notionRepository.getPageBlocks(id);
};

export const deletePiece = async (id: string) => {
  // sourceの判定
  const piece = await pieceRepository.getPieceById(id);

  if (!piece) {
    throw new Error(`Piece with id ${id} not found`);
  }

  // sourceによって処理の分岐
  if (piece.source === 'NOTION') {
    await notionRepository.archivePiecePage(id);

    await pieceRepository.deleteNotionPieceCache(id);
  } else if (piece.source === 'LOCAL') {
    await pieceRepository.deleteLocalPiece(id);
  }

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return { success: true, id, source: piece.source };
};

export const getPieceById = async (id: string) => {
  return await pieceRepository.getPieceById(id);
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

  const overduePieces = await pieceRepository.getPieces({
    area: 'Work',
    excludeStatus: ['Done', 'Canceled'],
    beforeDate: todayStr,
  });

  const updatedPieces = [];
  for (const piece of overduePieces) {
    try {
      if (piece.source === 'NOTION') {
        await notionRepository.updatePiecePage(piece.id, { date: todayStr });
        const updated = await pieceRepository.updateNotionPieceCache(piece.id, {
          date: todayStr,
        });
        if (updated) updatedPieces.push(updated);
      } else if (piece.source === 'LOCAL') {
        const updated = await pieceRepository.updateLocalPiece(piece.id, {
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

// 子タスクが全て完了しているかチェックし、親を更新する関数
export async function checkSiblingTaskState(childId: string): Promise<boolean> {
  if (!childId) return false;

  // 1. タスクを取得
  const childTask = await pieceRepository.getPieceById(childId);
  const parentId = childTask?.parent_id;

  if (!parentId) return false;
  const parentTask = await pieceRepository.getPieceById(parentId);

  // 親が存在しない、または既にDoneならこれ以上処理しない（負荷軽減・無限ループ防止）
  if (!parentTask || parentTask.status === 'Done') {
    return false;
  }

  // 2. この親を持つ子タスクを全件取得
  const subTasks = await pieceRepository.getPieces({ parentId });

  if (subTasks.length === 0) {
    return false;
  }

  // 3. 全ての子タスクがDoneか判定
  const allDone = subTasks.every((t) => t.status === 'Done');

  // 4. 全てDoneなら親タスクを更新
  if (allDone) {
    notificationServive.handleExternalPush({
      title: 'SubTasks Completed',
      note: `${parentTask.title}の子タスクが全件完了しました`,
      category: 'INFO',
      url: `gleis://task/${parentId}`,
      storageTarget: '',
      metadata: null,
      timestamp: null,
    });

    return true;
  }

  return false;
}

export const migrateParentIds = async () => {
  return await pieceRepository.migrateParentIds();
};
