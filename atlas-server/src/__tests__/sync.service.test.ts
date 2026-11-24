import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  getPiecePagesMock,
  upsertNotionPieceCacheMock,
  deleteStaleNotionCacheMock,
  getLastSyncTimeByKeyMock,
  updateSyncTimeByKeyMock,
  broadcastMock,
} = vi.hoisted(() => ({
  getPiecePagesMock: vi.fn(),
  upsertNotionPieceCacheMock: vi.fn(),
  deleteStaleNotionCacheMock: vi.fn(),
  getLastSyncTimeByKeyMock: vi.fn(),
  updateSyncTimeByKeyMock: vi.fn(),
  broadcastMock: vi.fn(),
}));

vi.mock('../repositories/notion.repository', () => ({
  getPiecePages: getPiecePagesMock,
}));

vi.mock('../repositories/piece.repository', () => ({
  upsertNotionPieceCache: upsertNotionPieceCacheMock,
  deleteStaleNotionCache: deleteStaleNotionCacheMock,
}));

vi.mock('../repositories/metadata.repository', () => ({
  getLastSyncTimeByKey: getLastSyncTimeByKeyMock,
  updateSyncTimeByKey: updateSyncTimeByKeyMock,
}));

vi.mock('../utils/websocket', () => ({
  broadcast: broadcastMock,
}));

import {
  parseNotionDate,
  mapNotionPageToDbPiece,
  syncNotionToLocal,
  type NotionPiecePage,
} from '../services/sync.service';

describe('sync.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseNotionDate', () => {
    it('parses date-only and datetime values with timezone offsets', () => {
      expect(parseNotionDate(null)).toEqual({ date: null, time: null });
      expect(parseNotionDate('2026-05-10')).toEqual({
        date: '2026-05-10',
        time: null,
      });
      expect(parseNotionDate('2026-05-10T14:30:00.000+09:00')).toEqual({
        date: '2026-05-10',
        time: '14:30:00.000',
      });
    });

    it('throws on unsupported date string', () => {
      expect(() => parseNotionDate('2026/05/10')).toThrow(
        'Unsupported Notion Piece date value',
      );
    });
  });

  describe('mapNotionPageToDbPiece', () => {
    it('maps full Notion properties accurately', () => {
      const page: NotionPiecePage = {
        id: 'page-1',
        last_edited_time: '2026-05-01T10:00:00.000Z',
        properties: {
          Name: { title: [{ plain_text: 'Design Review' }] },
          Note: { rich_text: [{ plain_text: 'Check security' }] },
          State: { status: { name: 'Going' } },
          _Area: { select: { name: 'Work' } },
          _Type: { select: { name: 'Task' } },
          _Topics: { multi_select: [{ name: 'Security' }, { name: 'Auth' }] },
          _Flags: { multi_select: [{ name: 'Urgent' }] },
          FreeKeyWord: { multi_select: [{ name: 'BFF' }] },
          prefs: { multi_select: [{ name: 'Tokyo' }] },
          URL: { url: 'https://example.com/spec' },
          Date: {
            date: {
              start: '2026-05-10T09:00:00+09:00',
              end: '2026-05-10T11:30:00+09:00',
            },
          },
          parent_id: { rich_text: [{ plain_text: 'parent-explicit-id' }] },
        },
      };

      expect(mapNotionPageToDbPiece(page)).toEqual({
        id: 'page-1',
        title: 'Design Review',
        note: 'Check security',
        status: 'Going',
        area: 'Work',
        type: 'Task',
        topics: ['Security', 'Auth'],
        flags: ['Urgent'],
        fkw: ['BFF'],
        prefs: ['Tokyo'],
        url: 'https://example.com/spec',
        start_date: '2026-05-10',
        start_time: '09:00:00',
        end_date: '2026-05-10',
        end_time: '11:30:00',
        parent_id: 'parent-explicit-id',
      });
    });

    it('falls back to defaults for unknown enum values and extracts parent_id from Notion URL', () => {
      const page: NotionPiecePage = {
        id: 'page-2',
        properties: {
          State: { status: { name: 'UnknownStatus' } },
          _Area: { select: { name: 'UnknownArea' } },
          _Type: { select: { name: 'UnknownType' } },
          URL: {
            url: 'https://www.notion.so/Project-1234567890abcdef1234567890abcdef',
          },
        },
      };

      const mapped = mapNotionPageToDbPiece(page);
      expect(mapped.title).toBe('No Title');
      expect(mapped.status).toBe('INBOX');
      expect(mapped.area).toBe('Work');
      expect(mapped.type).toBe('Task');
      expect(mapped.parent_id).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });
  });

  describe('syncNotionToLocal', () => {
    it('skips sync when last sync was within 60 seconds', async () => {
      getLastSyncTimeByKeyMock.mockResolvedValue(new Date().toISOString());

      const result = await syncNotionToLocal();

      expect(result).toBeUndefined();
      expect(getPiecePagesMock).not.toHaveBeenCalled();
      expect(broadcastMock).not.toHaveBeenCalled();
    });

    it('upserts fetched pages, prunes stale cache, updates timestamp, and broadcasts', async () => {
      getLastSyncTimeByKeyMock.mockResolvedValue('2020-01-01T00:00:00.000Z');
      getPiecePagesMock.mockResolvedValue([
        {
          id: 'notion-1',
          last_edited_time: '2026-05-01T12:00:00.000Z',
          properties: {
            Name: { title: [{ plain_text: 'Synced Task' }] },
          },
        },
      ]);
      upsertNotionPieceCacheMock.mockResolvedValue({
        id: 'notion-1',
        source: 'NOTION',
      });

      const result = await syncNotionToLocal();

      expect(result?.status).toBe('SUCCESS');
      expect(result?.count).toBe(1);
      expect(upsertNotionPieceCacheMock).toHaveBeenCalledTimes(1);
      expect(deleteStaleNotionCacheMock).toHaveBeenCalledWith(['notion-1']);
      expect(updateSyncTimeByKeyMock).toHaveBeenCalledWith(
        'last_notion_sync_time',
        expect.any(String),
      );
      expect(broadcastMock).toHaveBeenCalledWith(
        JSON.stringify({ type: 'REFRESH_PIECES' }),
      );
    });
  });
});
