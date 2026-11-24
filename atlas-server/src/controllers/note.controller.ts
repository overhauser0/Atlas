// atlas-server/src/controllers/note.controller.ts

import { Context } from 'hono';
import * as noteService from '../services/note.service';

// 1. ノート一覧の取得
export const getNotes = async (c: Context) => {
  const notes = await noteService.getNotes();
  return c.json({ notes: notes || [] }, 200);
};

// 2. ノートの新規作成
export const createNote = async (c: Context) => {
  const { title, content = '', url = '' } = await c.req.json();

  if (!title) {
    return c.json({ error: 'Title is required' }, 400);
  }

  const newNote = await noteService.createNote({ title, content, url });
  return c.json(newNote, 201);
};

// 3. ノートの更新（Debounce自動保存やピン留め切り替え用）
export const updateNote = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Note ID is required' }, 400);
  }

  const data = await c.req.json();
  if (Object.keys(data).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  try {
    const updatedNote = await noteService.updateNote(id, data);
    return c.json(updatedNote);
  } catch (error) {
    if (error instanceof Error && error.message.includes('no result')) {
      return c.json({ error: 'Note not found' }, 404);
    }
    throw error;
  }
};

// 4. ノートの削除（破棄、またはNotion昇格完了後に呼ばれる）
export const deleteNote = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Note ID is required' }, 400);
  }

  try {
    const result = await noteService.deleteNote(id);
    return c.json({ message: 'Note deleted successfully', id: result.id });
  } catch (error) {
    if (error instanceof Error && error.message.includes('no result')) {
      return c.json({ error: 'Note not found' }, 404);
    }
    throw error;
  }
};
