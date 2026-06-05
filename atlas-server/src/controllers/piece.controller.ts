import { Context } from 'hono';
import * as pieceService from '../services/piece.service';
import * as syncService from '../services/sync.service';

export const getPieces = async (c: Context) => {
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

  return c.json({ pieces: pieces || [] });
};

export const syncPieces = async (c: Context) => {
  try {
    const result = await syncService.syncNotionToLocal();
    return c.json({ ok: 'SYNC_SUCCESS', ...result });
  } catch (error: any) {
    console.error('❌ Sync Piece Error:', error.message || error);
    return c.json({ message: error.message || 'Unknown error' }, 500);
  }
};

export const updatePiece = async (c: Context) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!id) {
    return c.json({ message: 'Piece ID is required' }, 400);
  }

  try {
    const updatedPiece = await pieceService.updatePiece(id, body);
    return c.json({ task: updatedPiece });
  } catch (error: any) {
    console.error('Piece Update Error:', error);
    return c.json({ message: error.message }, 500);
  }
};

export const getPieceBlocks = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ message: 'Piece ID is required' }, 400);
  }

  try {
    const pieceBlocks = await pieceService.getPieceBlocks(id);
    return c.json({ blocks: pieceBlocks });
  } catch (error: any) {
    console.error('Piece Blocks Error:', error);
    return c.json({ message: error.message }, 500);
  }
};

export const createNewPiece = async (c: Context) => {
  const body = await c.req.json();
  try {
    const newPiece = await pieceService.createNewPiece(body);
    return c.json({ piece: newPiece });
  } catch (error: any) {
    console.error('Piece Creation Error:', error);
    return c.json({ message: error.message }, 500);
  }
};

export const getLastSyncTime = async (c: Context) => {
  try {
    const lastSyncTime = await syncService.getLastSyncTime();
    return c.json({ lastSyncTime });
  } catch (error: any) {
    console.warn('Error fetching last sync time:', error);
    return c.json({ message: error.message }, 500);
  }
};
