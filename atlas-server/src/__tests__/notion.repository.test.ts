import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  blocksChildrenListMock,
  blocksChildrenAppendMock,
  pagesUpdateMock,
  pagesCreateMock,
} = vi.hoisted(() => ({
  blocksChildrenListMock: vi.fn(),
  blocksChildrenAppendMock: vi.fn(),
  pagesUpdateMock: vi.fn(),
  pagesCreateMock: vi.fn(),
}));

vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    blocks: {
      children: {
        list: blocksChildrenListMock,
        append: blocksChildrenAppendMock,
      },
    },
    pages: {
      update: pagesUpdateMock,
      create: pagesCreateMock,
    },
    dataSources: {
      query: vi.fn(),
    },
  })),
}));

import {
  appendPageParagraphBlocks,
  buildParagraphBlock,
  getPageBlocks,
  splitTextChunks,
  updatePiecePage,
} from '../repositories/notion.repository';

describe('notion.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('splitTextChunks & buildParagraphBlock', () => {
    it('splits long text into chunks of at most 2000 characters', () => {
      const longText = 'a'.repeat(4500);
      const chunks = splitTextChunks(longText);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(2000);
      expect(chunks[1]).toHaveLength(2000);
      expect(chunks[2]).toHaveLength(500);
    });

    it('builds paragraph block with bold timestamp prefix and content', () => {
      const block = buildParagraphBlock({
        timestamp: '2026-11-24 14:30',
        content: 'カフェで休憩',
      });

      expect(block).toEqual({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: '2026-11-24 14:30 ' },
              annotations: { bold: true },
            },
            {
              type: 'text',
              text: { content: 'カフェで休憩' },
            },
          ],
        },
      });
    });

    it('builds paragraph block without timestamp when omitted', () => {
      const block = buildParagraphBlock({ content: 'メモのみ' });
      expect(block).toEqual({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'メモのみ' } }],
        },
      });
    });
  });

  describe('getPageBlocks', () => {
    it('fetches only immediate children when depth is 1', async () => {
      blocksChildrenListMock.mockResolvedValueOnce({
        results: [{ id: 'b1', has_children: true }],
        has_more: false,
        next_cursor: null,
      });

      const blocks = await getPageBlocks('page-1', 1);

      expect(blocks).toEqual([{ id: 'b1', has_children: true }]);
      expect(blocksChildrenListMock).toHaveBeenCalledTimes(1);
    });

    it('recursively fetches children_blocks up to depth 2', async () => {
      blocksChildrenListMock
        .mockResolvedValueOnce({
          results: [
            { id: 'b1', has_children: true },
            { id: 'b2', has_children: false },
          ],
          has_more: false,
          next_cursor: null,
        })
        .mockResolvedValueOnce({
          results: [{ id: 'c1', has_children: true }],
          has_more: false,
          next_cursor: null,
        });

      const blocks = await getPageBlocks('page-1', 2);

      expect(blocks).toEqual([
        {
          id: 'b1',
          has_children: true,
          children_blocks: [{ id: 'c1', has_children: true }],
        },
        { id: 'b2', has_children: false },
      ]);
      expect(blocksChildrenListMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('appendPageParagraphBlocks', () => {
    it('calls blocks.children.append with built paragraph blocks', async () => {
      const created = [{ id: 'new-b1', type: 'paragraph' }];
      blocksChildrenAppendMock.mockResolvedValueOnce({ results: created });

      const result = await appendPageParagraphBlocks('page-1', [
        { timestamp: '2026-11-24 14:30', content: 'ランチ美味しかった' },
      ]);

      expect(result).toEqual(created);
      expect(blocksChildrenAppendMock).toHaveBeenCalledWith({
        block_id: 'page-1',
        children: [
          buildParagraphBlock({
            timestamp: '2026-11-24 14:30',
            content: 'ランチ美味しかった',
          }),
        ],
      });
    });
  });

  describe('updatePiecePage', () => {
    it('writes prefs multi_select and normalizes HH:mm times to HH:mm:00', async () => {
      pagesUpdateMock.mockResolvedValueOnce({ id: 'page-1' });

      await updatePiecePage('page-1', {
        prefs: ['京都', '大阪'],
        start_date: '2026-11-20',
        start_time: '09:30',
        end_date: '2026-11-22',
        end_time: '18:00',
      });

      expect(pagesUpdateMock).toHaveBeenCalledWith({
        page_id: 'page-1',
        properties: {
          prefs: {
            multi_select: [{ name: '京都' }, { name: '大阪' }],
          },
          Date: {
            date: {
              start: '2026-11-20T09:30:00+09:00',
              end: '2026-11-22T18:00:00+09:00',
            },
          },
        },
      });
    });
  });
});
