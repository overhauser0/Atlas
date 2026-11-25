import { describe, it, expect, vi, beforeEach } from 'vitest';

const { atlasFetchMock } = vi.hoisted(() => ({
  atlasFetchMock: vi.fn(),
}));

vi.mock('../src/api', () => ({
  atlasFetch: atlasFetchMock,
}));

import {
  appendPieceBlocks,
  fetchPieceBlocks,
  getNotionBlockContent,
} from '../src/notion';

describe('@atlas/shared/notion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotionBlockContent', () => {
    it('extracts typed content matching block.type', () => {
      const content = getNotionBlockContent({
        id: 'b1',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ plain_text: 'hello' }],
        },
      });
      expect(content).toEqual({
        rich_text: [{ plain_text: 'hello' }],
      });
    });

    it('returns null when type is missing or content is non-object', () => {
      expect(getNotionBlockContent({ id: 'b2' })).toBeNull();
      expect(
        getNotionBlockContent({ id: 'b3', type: 'divider', divider: null }),
      ).toBeNull();
    });
  });

  describe('fetchPieceBlocks', () => {
    it('returns empty array when blockId is empty', async () => {
      expect(await fetchPieceBlocks('')).toEqual([]);
      expect(atlasFetchMock).not.toHaveBeenCalled();
    });

    it('calls GET /pieces/:id/blocks without depth query for default depth=1', async () => {
      atlasFetchMock.mockResolvedValue(
        new Response(JSON.stringify({ blocks: [{ id: 'b1' }] }), {
          status: 200,
        }),
      );

      const blocks = await fetchPieceBlocks('page-1');
      expect(blocks).toEqual([{ id: 'b1' }]);
      expect(atlasFetchMock).toHaveBeenCalledWith('/pieces/page-1/blocks', {
        method: 'GET',
        signal: undefined,
      });
    });

    it('appends depth query when depth > 1', async () => {
      atlasFetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            blocks: [{ id: 'b1', children_blocks: [{ id: 'c1' }] }],
          }),
          { status: 200 },
        ),
      );

      const blocks = await fetchPieceBlocks('page-1', { depth: 2 });
      expect(blocks).toEqual([{ id: 'b1', children_blocks: [{ id: 'c1' }] }]);
      expect(atlasFetchMock).toHaveBeenCalledWith(
        '/pieces/page-1/blocks?depth=2',
        { method: 'GET', signal: undefined },
      );
    });

    it('throws when response is not ok', async () => {
      atlasFetchMock.mockResolvedValue(new Response('error', { status: 500 }));
      await expect(fetchPieceBlocks('page-1')).rejects.toThrow(
        'Failed to fetch Notion blocks (500)',
      );
    });
  });

  describe('appendPieceBlocks', () => {
    it('posts paragraphs and returns created blocks', async () => {
      const created = [{ id: 'new-1', type: 'paragraph' }];
      atlasFetchMock.mockResolvedValue(
        new Response(JSON.stringify({ blocks: created }), { status: 201 }),
      );

      const result = await appendPieceBlocks('page-1', [
        { timestamp: '2026-11-24 14:30', content: 'Spark memo' },
      ]);

      expect(result).toEqual(created);
      expect(atlasFetchMock).toHaveBeenCalledWith('/pieces/page-1/blocks', {
        method: 'POST',
        body: JSON.stringify({
          paragraphs: [
            { timestamp: '2026-11-24 14:30', content: 'Spark memo' },
          ],
        }),
      });
    });

    it('surfaces server error message on failure', async () => {
      atlasFetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'Only Notion pieces support body blocks' }),
          { status: 400 },
        ),
      );

      await expect(
        appendPieceBlocks('local-1', [{ content: 'Spark' }]),
      ).rejects.toThrow('Only Notion pieces support body blocks');
    });
  });
});
