// atlas-server/src/services/diary.service.ts

import {
  CreateDiaryInput,
  UpdateDiaryInput,
} from '../models/diary.model';
import * as notionRepo from '../repositories/notion.repository';
import * as pieceRepo from '../repositories/piece.repository';
import * as diaryRepo from '../repositories/diary.repository';
import { broadcast } from '../utils/websocket';

export class DiaryDateConflictError extends Error {
  constructor(date: string) {
    super(`A diary already exists for ${date}`);
    this.name = 'DiaryDateConflictError';
  }
}

const isUniqueConstraintViolation = (
  error: unknown,
): error is { code: string } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505';

/** ローカルDBに保存されている日記一覧を取得する。 */
export const getDiaries = async () => {
  return await diaryRepo.getDiaries();
};

/** ローカルDBに日記を作成する。 */
export const createDiary = async (payload: CreateDiaryInput) => {
  const diary = await diaryRepo.createDiary(payload);
  if (!diary) {
    throw new DiaryDateConflictError(payload.date);
  }

  broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
  return diary;
};

/** ローカルDBの日記を更新する。 */
export const updateDiary = async (id: string, payload: UpdateDiaryInput) => {
  try {
    const diary = await diaryRepo.updateDiary(id, payload);
    if (!diary) {
      return undefined;
    }

    broadcast(JSON.stringify({ type: 'REFRESH_DIARIES' }));
    return diary;
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new DiaryDateConflictError(payload.date ?? 'requested date');
    }
    throw error;
  }
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
