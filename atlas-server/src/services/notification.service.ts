import { PushNotification } from '../schemas/push.schema';
import { Piece } from '../schemas/piece.schema';
import * as pgRepo from '../repositories/postgres.repository';
import * as pieceService from './piece.service';

/**
 * 外部（n8n等）からのプッシュイベントを処理する
 */
export const handleExternalPush = async (data: PushNotification) => {
  // JSTでの正しい「今日」の日付（YYYY-MM-DD形式）※スウェーデンを使ったハック
  const todayDate = new Date().toLocaleDateString('sv-SE');

  // 1. 通知履歴としてDBに保存
  const archived = await pgRepo.insertNotification(data);

  let pieceResult = null;
  // 2. Notionへのタスク化ロジック
  if (data.storageTarget === 'NOTION') {
    const pieceData: Piece = {
      title: data.title,
      note: data.note,
      status: 'INBOX',
      source: 'NOTION',
      area: 'Work',
      type: 'Task',
      fkw: [],
      topics: data.metadata?.topics || [],
      flags: data.metadata?.flags || [],
      date: todayDate,
      url: null,
    };
    pieceResult = await pieceService.createNewPiece(pieceData);
  }

  return { archived, pieceResult };
};

export const getNotificationHistory = async (c: any) => {
  return await pgRepo.getNotifications();
};

export const markNotificationAsRead = async (id: string) => {
  return await pgRepo.markAsRead(id);
};
export const markAllNotificationsAsRead = async () => {
  return await pgRepo.markAllAsRead();
};
