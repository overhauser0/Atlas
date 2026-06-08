import { Context } from 'hono';
import * as pieceService from '../services/piece.service';
import * as syncService from '../services/sync.service';

// ==========================================
// 1. CRUD Operations
// ==========================================

export const getPieces = async (c: Context) => {
  try {
    // URLクエリから条件を取得
    const area = c.req.query('area');
    const type = c.req.query('type');
    const status = c.req.query('status');
    const excludeStatus = c.req.query('excludeStatus');

    const pieces = await pieceService.getPiecesFromCache({
      area,
      type,
      status,
      excludeStatus: excludeStatus ? excludeStatus.split(',') : undefined,
    });

    return c.json({ pieces: pieces || [] }, 200);
  } catch (error: any) {
    console.error('❌ Get Pieces Error:', error);
    return c.json({ message: error.message || 'Failed to fetch pieces' }, 500);
  }
};

export const createPiece = async (c: Context) => {
  try {
    const body = await c.req.json();
    const newPiece = await pieceService.createNewPiece(body);
    return c.json({ piece: newPiece }, 201);
  } catch (error: any) {
    console.error('❌ Create Piece Error:', error);
    return c.json({ message: error.message || 'Failed to create piece' }, 500);
  }
};

export const updatePiece = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Piece ID is required' }, 400);

    const body = await c.req.json();
    const updatedPiece = await pieceService.updatePiece(id, body);

    // 💡 修正: task ではなく piece に統一
    return c.json({ piece: updatedPiece }, 200);
  } catch (error: any) {
    console.error(`❌ Update Piece Error (${c.req.param('id')}):`, error);
    return c.json({ message: error.message || 'Failed to update piece' }, 500);
  }
};

export const deletePiece = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Piece ID is required' }, 400);

    const result = await pieceService.deletePiece(id);
    return c.json(result, 200);
  } catch (error: any) {
    console.error(`❌ Delete Piece Error (${c.req.param('id')}):`, error);
    return c.json({ message: error.message || 'Failed to delete piece' }, 500);
  }
};

// ==========================================
// 2. Specific Operations (Blocks, Reschedule)
// ==========================================

export const getPieceBlocks = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Piece ID is required' }, 400);

    const pieceBlocks = await pieceService.getPieceBlocks(id);
    return c.json({ blocks: pieceBlocks }, 200);
  } catch (error: any) {
    console.error(`❌ Get Piece Blocks Error (${c.req.param('id')}):`, error);
    return c.json(
      { message: error.message || 'Failed to get piece blocks' },
      500,
    );
  }
};

export const rescheduleOverduePiecesToToday = async (c: Context) => {
  try {
    const updatedPieces = await pieceService.rescheduleOverduePiecesToToday();
    return c.json({ pieces: updatedPieces }, 200);
  } catch (error: any) {
    console.error('❌ Reschedule Overdue Pieces Error:', error);
    return c.json(
      { message: error.message || 'Failed to reschedule pieces' },
      500,
    );
  }
};

// ==========================================
// 3. Sync Operations
// ==========================================

export const syncPieces = async (c: Context) => {
  try {
    const result = await syncService.syncNotionToLocal();
    return c.json({ ok: 'SYNC_SUCCESS', ...result }, 200);
  } catch (error: any) {
    console.error('❌ Sync Piece Error:', error);
    return c.json({ message: error.message || 'Failed to sync pieces' }, 500);
  }
};

export const getLastSyncTime = async (c: Context) => {
  try {
    const lastSyncTime = await syncService.getLastSyncTime();
    return c.json({ lastSyncTime }, 200);
  } catch (error: any) {
    console.error('❌ Get Last Sync Time Error:', error);
    return c.json(
      { message: error.message || 'Failed to get last sync time' },
      500,
    );
  }
};
