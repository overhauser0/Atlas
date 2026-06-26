import { Diary, DiarySchema, DbDiarySchema } from '../schemas/diary.schema';
import * as notionRepo from '../repositories/notion.repository';
import * as postgresRepo from '../repositories/postgres.repository';
import { broadcast } from '../utils/websocket';

/**
 * Diaryを作成する
 */
export const createNewDiary = async (diary: Diary) => {
  const validatedDiary = DiarySchema.parse(diary);

  const page = await notionRepo.insertDiaryPage(validatedDiary);
  validatedDiary.id = page.id;

  const result = await postgresRepo.upsertDiary(validatedDiary, new Date());
  broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
  return result;
};

/**
 * [GET] DBにキャッシュされている日記一覧を取得する
 */
export const getDiaries = async () => {
  return await postgresRepo.getDiaries();
};

/**
 * [PATCH] DBにキャッシュされている日記を更新する
 * @param id
 * @param payload
 * @returns
 */
export const updateDiary = async (id: string, payload: Partial<Diary>) => {
  const dbUpdates = DbDiarySchema.partial().parse(payload);

  await notionRepo.updateDiaryPage(id, dbUpdates);
  const result = await postgresRepo.updateDiary(id, dbUpdates);

  broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
  return result;
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

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
  return { success: true, id, source: piece.source };
};
