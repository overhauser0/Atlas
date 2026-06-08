import { Context } from 'hono';
import * as pieceService from '../services/piece.service';
import * as syncService from '../services/sync.service';
import { PieceSchema } from '../schemas/piece.schema';

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
    const beforeDate = c.req.query('beforeDate');
    const afterDate = c.req.query('afterDate');

    const pieces = await pieceService.getPiecesFromCache({
      area,
      type,
      status,
      excludeStatus: excludeStatus ? excludeStatus.split(',') : undefined,
      beforeDate,
      afterDate,
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

export const promotePiece = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Piece ID is required' }, 400);

    // 1. ローカル取得
    const cachedPiece = await pieceService.getPieceById(id);
    if (!cachedPiece || cachedPiece.source !== 'LOCAL')
      return c.json({ message: 'Local piece not found' }, 404);

    const validation = PieceSchema.safeParse(cachedPiece);

    if (!validation.success) {
      return c.json(
        {
          message: 'Data validation failed',
          details: validation.error.format(),
        },
        400,
      );
    }

    const localPiece = validation.data;

    // 2. Notionへ作成
    const notionData = await pieceService.createNewPiece({
      ...localPiece,
      source: 'NOTION',
    });

    // 3. ローカル削除
    await pieceService.deletePiece(id);

    return c.json({ pieces: notionData || [] }, 200);
  } catch (err) {
    return c.json({ error: 'Promotion failed' }, 500);
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
