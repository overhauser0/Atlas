import * as postgresRepo from '../repositories/postgres.repository';
import { broadcast } from '../utils/websocket';

/**
 * ノート一覧を取得
 */
export const getNotes = async () => {
  return await postgresRepo.getLocalNotes();
};

/**
 * ノートを作成し、変更を通知
 */
export const createNote = async (data: {
  title: string;
  content?: string;
  url?: string;
}) => {
  const result = await postgresRepo.createLocalNote(data);

  // スマホやPCのクライアントにリストの再取得を促す
  broadcast(JSON.stringify({ type: 'REFRESH_NOTES' }));

  return result;
};

/**
 * ノートを更新し、変更を通知
 */
export const updateNote = async (
  id: string,
  data: Partial<{
    title: string;
    content: string;
    url: string;
    is_pinned: boolean;
  }>,
) => {
  const result = await postgresRepo.updateLocalNote(id, data);

  broadcast(JSON.stringify({ type: 'REFRESH_NOTES' }));

  return result;
};

/**
 * ノートを削除し、変更を通知
 */
export const deleteNote = async (id: string) => {
  const result = await postgresRepo.deleteLocalNote(id);

  broadcast(JSON.stringify({ type: 'REFRESH_NOTES' }));

  return result;
};
