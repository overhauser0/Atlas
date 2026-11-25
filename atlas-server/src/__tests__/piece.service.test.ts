import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  insertPiecePageMock,
  updatePiecePageMock,
  archivePiecePageMock,
  getPageBlocksMock,
  appendPageParagraphBlocksMock,
  upsertNotionPieceCacheMock,
  updateNotionPieceCacheMock,
  deleteNotionPieceCacheMock,
  deleteLocalPieceMock,
  getPieceByIdMock,
  getPiecesMock,
  rebindParentIdMock,
  migrateLocalPieceLinksToNotionMock,
  handleExternalPushMock,
  broadcastMock,
} = vi.hoisted(() => ({
  insertPiecePageMock: vi.fn(),
  updatePiecePageMock: vi.fn(),
  archivePiecePageMock: vi.fn(),
  getPageBlocksMock: vi.fn(),
  appendPageParagraphBlocksMock: vi.fn(),
  upsertNotionPieceCacheMock: vi.fn(),
  updateNotionPieceCacheMock: vi.fn(),
  deleteNotionPieceCacheMock: vi.fn(),
  deleteLocalPieceMock: vi.fn(),
  getPieceByIdMock: vi.fn(),
  getPiecesMock: vi.fn(),
  rebindParentIdMock: vi.fn(),
  migrateLocalPieceLinksToNotionMock: vi.fn(),
  handleExternalPushMock: vi.fn(),
  broadcastMock: vi.fn(),
}));

vi.mock('../repositories/notion.repository', () => ({
  insertPiecePage: insertPiecePageMock,
  updatePiecePage: updatePiecePageMock,
  archivePiecePage: archivePiecePageMock,
  getPageBlocks: getPageBlocksMock,
  appendPageParagraphBlocks: appendPageParagraphBlocksMock,
}));

vi.mock('../repositories/piece.repository', () => ({
  upsertNotionPieceCache: upsertNotionPieceCacheMock,
  deleteNotionPieceCache: deleteNotionPieceCacheMock,
  deleteLocalPiece: deleteLocalPieceMock,
  getPieceById: getPieceByIdMock,
  getPieces: getPiecesMock,
  rebindParentId: rebindParentIdMock,
  insertLocalPiece: vi.fn(),
  insertBatchLocalPieces: vi.fn(),
  updateNotionPieceCache: updateNotionPieceCacheMock,
  updateLocalPiece: vi.fn(),
  findOrphanedPieces: vi.fn(),
  clearParentIds: vi.fn(),
}));

vi.mock('../repositories/person.repository', () => ({
  migrateLocalPieceLinksToNotion: migrateLocalPieceLinksToNotionMock,
}));

vi.mock('../services/notification.service', () => ({
  handleExternalPush: handleExternalPushMock,
}));

vi.mock('../services/sync.service', () => ({
  syncNotionToLocal: vi.fn(),
}));

vi.mock('../utils/websocket', () => ({
  broadcast: broadcastMock,
}));

import {
  PieceServiceError,
  appendPieceBlocks,
  checkSiblingTaskStateByParentId,
  deletePiece,
  getPieceBlocks,
  promoteLocalPiece,
  updatePiece,
} from '../services/piece.service';
import type { Piece } from '../models/piece.model';

const sampleLocalPiece: Piece = {
  id: 'local-1',
  title: 'Project Kickoff',
  note: 'Details',
  status: 'Going',
  source: 'LOCAL',
  area: 'Work',
  type: 'Task',
  topics: ['Planning'],
  flags: [],
  fkw: [],
  prefs: [],
  url: null,
  start_date: '2026-05-10',
  start_time: null,
  end_date: null,
  end_time: null,
  parent_id: null,
};

describe('piece.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkSiblingTaskStateByParentId', () => {
    it('notifies when all subtasks are Done and parent is not Done', async () => {
      getPieceByIdMock.mockResolvedValue({
        id: 'parent-1',
        title: 'Release v2',
        status: 'Going',
        source: 'LOCAL',
      });
      getPiecesMock.mockResolvedValue([
        { id: 'c1', status: 'Done' },
        { id: 'c2', status: 'Done' },
      ]);

      const notified = await checkSiblingTaskStateByParentId('parent-1');

      expect(notified).toBe(true);
      expect(handleExternalPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'SubTasks Completed',
          note: 'Release v2の子タスクが全件完了しました',
          url: 'gleis://task/parent-1',
        }),
      );
    });

    it('returns false without notifying if any subtask is incomplete or parent is already Done', async () => {
      getPieceByIdMock.mockResolvedValueOnce({
        id: 'parent-1',
        title: 'Release v2',
        status: 'Going',
      });
      getPiecesMock.mockResolvedValueOnce([
        { id: 'c1', status: 'Done' },
        { id: 'c2', status: 'INBOX' },
      ]);

      expect(await checkSiblingTaskStateByParentId('parent-1')).toBe(false);
      expect(handleExternalPushMock).not.toHaveBeenCalled();

      getPieceByIdMock.mockResolvedValueOnce({
        id: 'parent-2',
        title: 'Done Parent',
        status: 'Done',
      });

      expect(await checkSiblingTaskStateByParentId('parent-2')).toBe(false);
      expect(getPiecesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('promoteLocalPiece', () => {
    it('migrates person links and child parent_ids before deleting local piece', async () => {
      const callOrder: string[] = [];

      insertPiecePageMock.mockResolvedValue({ id: 'notion-new-1' });
      upsertNotionPieceCacheMock.mockImplementation(async () => {
        callOrder.push('upsertNotion');
        return { id: 'notion-new-1', source: 'NOTION' };
      });
      migrateLocalPieceLinksToNotionMock.mockImplementation(async () => {
        callOrder.push('migratePeople');
        return [{ id: 'link-1' }];
      });
      rebindParentIdMock.mockImplementation(async () => {
        callOrder.push('rebindChildren');
        return { localIds: ['local-child-1'], notionIds: ['notion-child-1'] };
      });
      updatePiecePageMock.mockImplementation(async () => {
        callOrder.push('updateNotionChild');
      });
      getPieceByIdMock.mockResolvedValue({ id: 'local-1', source: 'LOCAL' });
      deleteLocalPieceMock.mockImplementation(async () => {
        callOrder.push('deleteLocal');
      });

      const promoted = await promoteLocalPiece('local-1', sampleLocalPiece);

      expect(promoted).toEqual({ id: 'notion-new-1', source: 'NOTION' });
      expect(migrateLocalPieceLinksToNotionMock).toHaveBeenCalledWith(
        'local-1',
        'notion-new-1',
      );
      expect(rebindParentIdMock).toHaveBeenCalledWith(
        'local-1',
        'notion-new-1',
      );
      expect(updatePiecePageMock).toHaveBeenCalledWith('notion-child-1', {
        parent_id: 'notion-new-1',
      });
      expect(callOrder).toEqual([
        'upsertNotion',
        'migratePeople',
        'rebindChildren',
        'updateNotionChild',
        'deleteLocal',
      ]);
      expect(broadcastMock).toHaveBeenCalledWith(
        JSON.stringify({ type: 'REFRESH_PEOPLE' }),
      );
    });

    it('throws without deleting local piece if Notion upsert fails to return an id', async () => {
      insertPiecePageMock.mockResolvedValue({ id: 'notion-new-2' });
      upsertNotionPieceCacheMock.mockResolvedValue(undefined);

      await expect(
        promoteLocalPiece('local-1', sampleLocalPiece),
      ).rejects.toThrow('Failed to create Notion piece during promotion');

      expect(deleteLocalPieceMock).not.toHaveBeenCalled();
      expect(migrateLocalPieceLinksToNotionMock).not.toHaveBeenCalled();
    });
  });

  describe('deletePiece', () => {
    it('archives Notion page and deletes cache when source is NOTION', async () => {
      getPieceByIdMock.mockResolvedValue({ id: 'n-1', source: 'NOTION' });

      const result = await deletePiece('n-1');

      expect(archivePiecePageMock).toHaveBeenCalledWith('n-1');
      expect(deleteNotionPieceCacheMock).toHaveBeenCalledWith('n-1');
      expect(deleteLocalPieceMock).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, id: 'n-1', source: 'NOTION' });
    });

    it('throws when target piece does not exist', async () => {
      getPieceByIdMock.mockResolvedValue(null);

      await expect(deletePiece('missing-id')).rejects.toThrow(
        'Piece with id missing-id not found',
      );
    });
  });

  describe('getPieceBlocks', () => {
    it('passes depth parameter through to notionRepository.getPageBlocks', async () => {
      const blocks = [{ id: 'b1', children_blocks: [{ id: 'c1' }] }];
      getPageBlocksMock.mockResolvedValue(blocks);

      const result = await getPieceBlocks('notion-1', 2);

      expect(getPageBlocksMock).toHaveBeenCalledWith('notion-1', 2);
      expect(result).toEqual(blocks);
    });
  });

  describe('appendPieceBlocks', () => {
    it('appends paragraph blocks when target piece is NOTION', async () => {
      getPieceByIdMock.mockResolvedValue({ id: 'notion-1', source: 'NOTION' });
      const created = [{ id: 'new-1', type: 'paragraph' }];
      appendPageParagraphBlocksMock.mockResolvedValue(created);

      const result = await appendPieceBlocks('notion-1', [
        { timestamp: '2026-11-24 14:30', content: 'Spark note' },
      ]);

      expect(appendPageParagraphBlocksMock).toHaveBeenCalledWith('notion-1', [
        { timestamp: '2026-11-24 14:30', content: 'Spark note' },
      ]);
      expect(result).toEqual(created);
    });

    it('throws 404 PieceServiceError when piece does not exist', async () => {
      getPieceByIdMock.mockResolvedValue(null);

      await expect(
        appendPieceBlocks('missing-1', [{ content: 'Spark' }]),
      ).rejects.toEqual(new PieceServiceError(404, 'Piece not found'));
      expect(appendPageParagraphBlocksMock).not.toHaveBeenCalled();
    });

    it('throws 400 PieceServiceError when piece source is LOCAL', async () => {
      getPieceByIdMock.mockResolvedValue({ id: 'local-1', source: 'LOCAL' });

      await expect(
        appendPieceBlocks('local-1', [{ content: 'Spark' }]),
      ).rejects.toEqual(
        new PieceServiceError(400, 'Only Notion pieces support body blocks'),
      );
      expect(appendPageParagraphBlocksMock).not.toHaveBeenCalled();
    });
  });

  describe('updatePiece', () => {
    it('forwards prefs to Notion page update and cache update', async () => {
      getPieceByIdMock.mockResolvedValue({ id: 'notion-1', source: 'NOTION' });
      updatePiecePageMock.mockResolvedValue({ id: 'notion-1' });
      updateNotionPieceCacheMock.mockResolvedValue({
        id: 'notion-1',
        prefs: ['京都'],
        source: 'NOTION',
      });

      await updatePiece('notion-1', { prefs: ['京都'], source: 'NOTION' });

      expect(updatePiecePageMock).toHaveBeenCalledWith(
        'notion-1',
        expect.objectContaining({ prefs: ['京都'] }),
      );
      expect(updateNotionPieceCacheMock).toHaveBeenCalledWith(
        'notion-1',
        expect.objectContaining({ prefs: ['京都'] }),
      );
    });
  });
});
