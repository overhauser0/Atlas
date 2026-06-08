// src/services/notification.service.ts
import { PushNotification } from '../schemas/push.schema';
import { Piece, PieceSchema } from '../schemas/piece.schema';
import * as postgresRepo from '../repositories/postgres.repository';
import * as pieceService from './piece.service';

// 💡 追加: 検索パラメータの型定義
export interface GetNotificationHistoryParams {
  limit: number;
  offset: number;
  isRead?: boolean;
}

export const handleExternalPush = async (data: PushNotification) => {
  const todayDate = new Date().toLocaleDateString('sv-SE');
  const archived = await postgresRepo.insertNotification(data);

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

  return { archived, pieceResult };
};

export const getNotificationHistory = async (
  params: GetNotificationHistoryParams,
) => {
  const { limit, offset, isRead } = params;

  let query = postgresRepo.db.selectFrom('notifications').selectAll();

  if (isRead !== undefined) {
    query = query.where('is_read', '=', isRead);
  }

  return await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();
};

export const markNotificationAsRead = async (id: string) => {
  return await postgresRepo.markNotificationAsRead(id);
};

export const markAllNotificationsAsRead = async () => {
  return await postgresRepo.markAllNotificationsAsRead();
};
