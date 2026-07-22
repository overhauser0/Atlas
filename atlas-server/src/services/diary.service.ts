import { Diary, DiarySchema, UpdateDiarySchema } from '../models/diary.model';
import * as notionRepo from '../repositories/notion.repository';
import * as pieceRepo from '../repositories/piece.repository';
import * as diaryRepo from '../repositories/diary.repository';
import { broadcast } from '../utils/websocket';

/**
 * [GET] DBにキャッシュされている日記一覧を取得する
 */
export const getDiaries = async () => {
  return await diaryRepo.getDiaries();
};

/**
 * [PATCH] DBにキャッシュされている日記を更新する
 * @param id
 * @param payload
 * @returns
 */
export const updateDiary = async (id: string, payload: Partial<Diary>) => {
  const dbUpdates = UpdateDiarySchema.partial().parse(payload);

  await notionRepo.updateDiaryPage(id, dbUpdates);
  const result = await diaryRepo.updateDiary(id, dbUpdates);

  broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
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
