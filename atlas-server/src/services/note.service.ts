// atlas-server/src/services/note.service.ts

import * as noteRepo from '../repositories/note.repository';
import { broadcast } from '../utils/websocket';

/**
 * ノート一覧を取得する。
 */
export const getNotes = async () => {
  return await noteRepo.getLocalNotes();
};

/**
 * ノートを作成し、変更を通知する。
 */
export const createNote = async (data: {
  title: string;
  content?: string;
  url?: string;
}) => {
  const result = await noteRepo.createLocalNote(data);

  broadcast(JSON.stringify({ type: 'REFRESH_NOTES' }));

  return result;
};

/**
 * ノートを更新し、変更を通知する。
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
  const result = await noteRepo.updateLocalNote(id, data);

  broadcast(JSON.stringify({ type: 'REFRESH_NOTES' }));

  return result;
};

/**
 * ノートを削除し、変更を通知する。
 */
export const deleteNote = async (id: string) => {
  const result = await noteRepo.deleteLocalNote(id);

  broadcast(JSON.stringify({ type: 'REFRESH_NOTES' }));

  return result;
};
