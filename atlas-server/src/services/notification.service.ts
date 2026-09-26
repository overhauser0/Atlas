// atlas-server/src/services/notification.service.ts

import { PushNotificationInput } from '../models/push.model';
import { Piece, PieceSchema } from '../models/piece.model';
import * as notificationRepo from '../repositories/notification.repository';
import * as pieceService from './piece.service';
import { broadcast } from '../utils/websocket';

export interface GetNotificationHistoryParams {
  limit: number;
  offset: number;
  isRead?: boolean;
}

/** 外部通知を保存し、必要に応じて Piece も作成する。 */
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

/** 通知履歴を取得する。 */
export const getNotificationHistory = async (
  params: GetNotificationHistoryParams,
) => {
  const { limit, offset, isRead } = params;

  return await notificationRepo.getNotifications(limit, offset, isRead);
};

/** 指定した通知を既読にする。 */
export const markNotificationAsRead = async (id: string) => {
  broadcast(JSON.stringify({ type: 'REFRESH_NOTIFICATIONS' }));
  return await notificationRepo.markNotificationAsRead(id);
};

/** 未読通知をすべて既読にする。 */
export const markAllNotificationsAsRead = async () => {
  broadcast(JSON.stringify({ type: 'REFRESH_NOTIFICATIONS' }));
  return await notificationRepo.markAllNotificationsAsRead();
};
