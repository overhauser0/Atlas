import { Context } from 'hono';
import * as noteService from '../services/note.service';
import { error } from 'console';

// 1. ノート一覧の取得
export const getNotes = async (c: Context) => {
  try {
    const notes = await noteService.getNotes();
    return c.json({ notes: notes || [] }, 200);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json({ error: 'Failed to fetch notes' }, 500);
  }
};

// 2. ノートの新規作成
export const createNote = async (c: Context) => {
  try {
    const { title, content = '', url = '' } = await c.req.json();

    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    const newNote = await noteService.createNote({ title, content, url });
    return c.json(newNote, 201);
  } catch (error) {
    console.error('Error creating note:', error);
    return c.json({ error: 'Failed to create note' }, 500);
  }
};

// 3. ノートの更新（Debounce自動保存やピン留め切り替え用）
export const updateNote = async (c: Context) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();

    if (!id) throw error;

    if (Object.keys(data).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    const updatedNote = await noteService.updateNote(id, data);
    return c.json(updatedNote);
  } catch (error: any) {
    console.error('Error updating note:', error);
    if (error.message && error.message.includes('no result')) {
      return c.json({ error: 'Note not found' }, 404);
    }
    return c.json({ error: 'Failed to update note' }, 500);
  }
};

// 4. ノートの削除（破棄、またはNotion昇格完了後に呼ばれる）
export const deleteNote = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) throw error;
    const result = await noteService.deleteNote(id);
    return c.json({ message: 'Note deleted successfully', id: result.id });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    if (error.message && error.message.includes('no result')) {
      return c.json({ error: 'Note not found' }, 404);
    }
    return c.json({ error: 'Failed to delete note' }, 500);
  }
};
