// atlas-server/src/services/diary.service.ts

import {
  CreateDiaryInput,
  DiaryRangeQuery,
  UpdateDiaryInput,
} from '../models/diary.model';
import * as diaryRepo from '../repositories/diary.repository';
import { broadcast } from '../utils/websocket';

/** ローカルDBに保存されている日記一覧を取得する。 */
export const getDiaries = async (range: DiaryRangeQuery) => {
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
