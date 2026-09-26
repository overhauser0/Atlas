// atlas-server/src/services/diary.service.ts

import { Diary, DiarySchema, UpdateDiarySchema } from '../models/diary.model';
import * as notionRepo from '../repositories/notion.repository';
import * as pieceRepo from '../repositories/piece.repository';
import * as diaryRepo from '../repositories/diary.repository';
import { broadcast } from '../utils/websocket';

/** DBにキャッシュされている日記一覧を取得する。 */
export const getDiaries = async () => {
  return await diaryRepo.getDiaries();
};

/** DBにキャッシュされている日記を更新する。 */
export const updateDiary = async (id: string, payload: Partial<Diary>) => {
  const dbUpdates = UpdateDiarySchema.partial().parse(payload);

  await notionRepo.updateDiaryPage(id, dbUpdates);
  const result = await diaryRepo.updateDiary(id, dbUpdates);

  broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
  return result;
};

/** Notionページの本文ブロックを取得する。 */
export const getPieceBlocks = async (id: string) => {
  return await notionRepo.getPageBlocks(id);
};

/** Pieceを削除し、必要なキャッシュも更新する。 */
export const deletePiece = async (id: string) => {
  const piece = await pieceRepo.getPieceById(id);

  if (!piece) {
    throw new Error(`Piece with id ${id} not found`);
  }

  if (piece.source === 'NOTION') {
    await notionRepo.archivePiecePage(id);

    await pieceRepo.deleteNotionPieceCache(id);
  } else if (piece.source === 'LOCAL') {
    await pieceRepo.deleteLocalPiece(id);
  }

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return { success: true, id, source: piece.source };
};
