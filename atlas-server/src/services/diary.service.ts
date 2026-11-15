// atlas-server/src/services/diary.service.ts

import {
  CreateDiaryInput,
  DiaryRangeQuery,
  UpdateDiaryInput,
} from '../models/diary.model';
import * as notionRepo from '../repositories/notion.repository';
import * as pieceRepo from '../repositories/piece.repository';
import * as diaryRepo from '../repositories/diary.repository';
import { broadcast } from '../utils/websocket';

/** ローカルDBに保存されている日記一覧を取得する。 */
export const getDiaries = async (
  range: DiaryRangeQuery,
) => {
  return await diaryRepo.getDiaries(range);
};

/** 指定した日付の日記を取得する。 */
export const getDiaryByDate = async (date: string) => {
  return await diaryRepo.getDiaryByDate(date);
};

/** 日記を日付で作成または上書きする。 */
export const upsertDiary = async (payload: CreateDiaryInput) => {
  const diary = await diaryRepo.upsertDiary(payload);
  broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
  return diary;
};

/** 日付指定で日記を部分更新する。 */
export const updateDiaryByDate = async (
  date: string,
  payload: UpdateDiaryInput,
) => {
  const diary = await diaryRepo.updateDiaryByDate(date, payload);
  if (diary) {
    broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
  }
  return diary;
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
