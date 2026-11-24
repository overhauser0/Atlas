// atlas-server/src/controllers/piece.controller.ts

import { Context } from 'hono';
import * as pieceService from '../services/piece.service';
import * as syncService from '../services/sync.service';
import { PieceSchema } from '../models/piece.model';

// ==========================================
// 1. CRUD Operations
// ==========================================

export const getPieces = async (c: Context) => {
  const area = c.req.query('area');
  const type = c.req.query('type');
  const status = c.req.query('status');
  const excludeStatus = c.req.query('excludeStatus');
  const beforeDate = c.req.query('beforeDate');
  const afterDate = c.req.query('afterDate');
  const parentId = c.req.query('parentId');

  const pieces = await pieceService.getPiecesFromCache({
    area,
    type,
    status,
    excludeStatus: excludeStatus ? excludeStatus.split(',') : undefined,
    beforeDate,
    afterDate,
    parentId,
  });

  return c.json({ pieces: pieces || [] }, 200);
};

export const getPieceById = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) return c.json({ message: 'Piece ID is required' }, 400);
  const cachedPiece = await pieceService.getPieceById(id);
  if (!cachedPiece) return c.json({ message: 'Piece not found' }, 404);

  return c.json({ piece: cachedPiece }, 200);
};

export const createPiece = async (c: Context) => {
  const rawData = await c.req.json();

  const validation = PieceSchema.safeParse(rawData);
  if (!validation.success) {
    console.warn(
      'piece.controller: createPiece safeParse Error',
      validation.error.format(),
    );
    return c.json(
      {
        message: 'Invalid input data',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const piece = validation.data;
  const createdPiece = await pieceService.createNewPiece(piece);
  return c.json({ piece: createdPiece }, 201);
};

export const createPiecesBulk = async (c: Context) => {
  const { pieces } = await c.req.json();

  if (!Array.isArray(pieces) || pieces.length === 0) {
    return c.json(
      { error: 'Pieces array is missing, empty, or invalid' },
      400,
    );
  }

  const insertedPieces = await pieceService.createPiecesBulk(pieces);

  return c.json(
    {
      success: true,
      count: insertedPieces.length,
      data: insertedPieces,
    },
    201,
  );
};

export const updatePiece = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) return c.json({ message: 'Piece ID is required' }, 400);

  const rawData = await c.req.json();

  const validation = PieceSchema.omit({ id: true })
    .partial()
    .safeParse(rawData);

  if (!validation.success) {
    console.warn(
      `⚠️ Validation failed for updatePiece (${id}):`,
      validation.error.format(),
    );
    return c.json(
      {
        message: 'Invalid input data',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const updatedPiece = await pieceService.updatePiece(id, validation.data);
  await pieceService.checkSiblingTaskState(id);

  return c.json({ piece: updatedPiece }, 200);
};

export const deletePiece = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) return c.json({ message: 'Piece ID is required' }, 400);

  const targetPiece = await pieceService.getPieceById(id);
  const parentId = targetPiece?.parent_id;

  const result = await pieceService.deletePiece(id);
  await pieceService.checkSiblingTaskStateByParentId(parentId);

  return c.json(result, 200);
};

export const promotePiece = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) return c.json({ message: 'Piece ID is required' }, 400);

  const cachedPiece = await pieceService.getPieceById(id);
  if (!cachedPiece || cachedPiece.source !== 'LOCAL')
    return c.json({ message: 'Local piece not found' }, 404);

  const validation = PieceSchema.safeParse(cachedPiece);
  if (!validation.success) {
    return c.json(
      {
        message: 'Data validation failed',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const notionData = await pieceService.promoteLocalPiece(id, validation.data);
  return c.json({ pieces: notionData || [] }, 200);
};

// ==========================================
// 2. Specific Operations (Blocks, Reschedule)
// ==========================================

export const getPieceBlocks = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) return c.json({ message: 'Piece ID is required' }, 400);

  const pieceBlocks = await pieceService.getPieceBlocks(id);
  return c.json({ blocks: pieceBlocks }, 200);
};

export const rescheduleOverduePiecesToToday = async (c: Context) => {
  const updatedPieces = await pieceService.rescheduleOverduePiecesToToday();
  return c.json({ pieces: updatedPieces }, 200);
};

// ==========================================
// 3. Sync Operations
// ==========================================

export const syncPieces = async (c: Context) => {
  const result = await syncService.syncNotionToLocal();
  await pieceService.cleanUpOrphanedTasks();
  return c.json({ ok: 'SYNC_SUCCESS', ...result }, 200);
};

export const getLastSyncTime = async (c: Context) => {
  const lastSyncTime = await syncService.getLastSyncTime();
  return c.json({ lastSyncTime }, 200);
};
