// src/services/notification.service.ts
import { PushNotificationInput } from '../models/push.model';
import { Piece, PieceSchema } from '../models/piece.model';
import * as notificationRepo from '../repositories/notification.repository';
import * as pieceService from './piece.service';
import { broadcast } from '../utils/websocket';

// 💡 追加: 検索パラメータの型定義
export interface GetNotificationHistoryParams {
  limit: number;
  offset: number;
  isRead?: boolean;
}

export const handleExternalPush = async (data: PushNotificationInput) => {
  const todayDate = new Date().toLocaleDateString('sv-SE');
  const archived = await notificationRepo.insertNotification(data);

  let pieceResult = null;
  if (data.storageTarget === 'NOTION') {
    const pieceData: Piece = PieceSchema.parse({
      title: data.title,
      note: data.note,
      status: 'INBOX',
      source: 'NOTION',
      area: 'Work',
      type: 'Task',
      topics: data.metadata?.topics || [],
      flags: data.metadata?.flags || [],
      date: todayDate,
    });
    pieceResult = await pieceService.createNewPiece(pieceData);
  }

  broadcast(JSON.stringify({ type: 'REFRESH_NOTIFICATIONS' }));

  return { archived, pieceResult };
};

export const getNotificationHistory = async (
  params: GetNotificationHistoryParams,
) => {
  const { limit, offset, isRead } = params;

  return await notificationRepo.getNotifications(limit, offset, isRead);
};

export const markNotificationAsRead = async (id: string) => {
  broadcast(JSON.stringify({ type: 'REFRESH_NOTIFICATIONS' }));
  return await notificationRepo.markNotificationAsRead(id);
};

export const markAllNotificationsAsRead = async () => {
  broadcast(JSON.stringify({ type: 'REFRESH_NOTIFICATIONS' }));
  return await notificationRepo.markAllNotificationsAsRead();
};
