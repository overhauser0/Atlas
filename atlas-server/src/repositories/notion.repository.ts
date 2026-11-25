// atlas-server/src/repositories/notion.repository.ts

import { Client } from '@notionhq/client';
import {
  AppendPieceParagraphInput,
  DbPiece,
  UpdatePieceInput,
} from '../models/piece.model';

// Notion API configuration

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });
const NOTION_PIECE_DS_ID = process.env.NOTION_PIECE_DS_ID!;
const NOTION_MONTHLY_DS_ID = process.env.NOTION_MONTHLY_DS_ID!;
const NOTION_WEEKLY_DS_ID = process.env.NOTION_WEEKLY_DS_ID!;

const NOTION_RICH_TEXT_CHUNK_LIMIT = 2000;
const NOTION_BLOCK_FETCH_CONCURRENCY = 3;

// Piece operations

const hasPieceDateFields = (piece: Partial<DbPiece>) =>
  piece.start_date !== undefined ||
  piece.start_time !== undefined ||
  piece.end_date !== undefined ||
  piece.end_time !== undefined;

const normalizeTimeWithSeconds = (time: string) =>
  /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;

const toNotionDateValue = (
  date?: string | Date | null,
  time?: string | null,
) => {
  if (!date) return null;

  const datePart =
    date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!datePart) {
    throw new Error(`Invalid Piece date value for Notion: ${date}`);
  }

  return `${datePart}${time ? `T${normalizeTimeWithSeconds(time)}+09:00` : ''}`;
};

const toNotionDateRange = (piece: Partial<DbPiece>) => {
  const start = toNotionDateValue(piece.start_date, piece.start_time);
  const end = toNotionDateValue(piece.end_date, piece.end_time);
  return start ? { date: { start, end } } : { date: null };
};

type NotionDataSourcePage = Awaited<
  ReturnType<typeof notionClient.dataSources.query>
>['results'][number];

type CreatePageProperties = NonNullable<
  Parameters<typeof notionClient.pages.create>[0]['properties']
>;

type UpdatePageProperties = NonNullable<
  Parameters<typeof notionClient.pages.update>[0]['properties']
>;

type NotionBlockItem = Awaited<
  ReturnType<typeof notionClient.blocks.children.list>
>['results'][number];

export type NotionBlockWithChildren = NotionBlockItem & {
  children_blocks?: NotionBlockWithChildren[];
};

type AppendBlockChild = Parameters<
  typeof notionClient.blocks.children.append
>[0]['children'][number];

/** Notion の 1 rich_text あたり 2,000 文字上限に合わせて文字列を分割する。 */
export const splitTextChunks = (
  text: string,
  maxLength = NOTION_RICH_TEXT_CHUNK_LIMIT,
): string[] => {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
};

/** タイムスタンプ付きの通常段落ブロック（paragraph）を構築する。 */
export const buildParagraphBlock = (
  paragraph: AppendPieceParagraphInput,
): AppendBlockChild => {
  const richText: Array<{
    type: 'text';
    text: { content: string };
    annotations?: { bold: true };
  }> = [];

  if (paragraph.timestamp) {
    richText.push({
      type: 'text',
      text: { content: `${paragraph.timestamp} ` },
      annotations: { bold: true },
    });
  }

  for (const chunk of splitTextChunks(paragraph.content)) {
    richText.push({
      type: 'text',
      text: { content: chunk },
    });
  }

  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richText,
    },
  };
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};

/** Notionの Piece ページをすべて取得する。 */
export const getPiecePages = async (): Promise<NotionDataSourcePage[]> => {
  let allPages: NotionDataSourcePage[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const response: Awaited<ReturnType<typeof notionClient.dataSources.query>> =
      await notionClient.dataSources.query({
        data_source_id: NOTION_PIECE_DS_ID,
        start_cursor: cursor,
        page_size: 100,
      });

    allPages = [...allPages, ...response.results];
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return allPages;
};

/** Notionに Piece ページを作成する。 */
export const insertPiecePage = async (piece: DbPiece) => {
  const properties: CreatePageProperties = {
    Name: { title: [{ text: { content: piece.title } }] },
    State: { status: { name: piece.status || 'INBOX' } },
    _Area: { select: { name: piece.area || 'Work' } },
    _Type: { select: { name: piece.type || 'Task' } },
  };

  if (hasPieceDateFields(piece)) {
    properties.Date = toNotionDateRange(piece);
  }
  if (Array.isArray(piece?.topics)) {
    properties._Topics = {
      multi_select: piece.topics.map((t) => ({ name: t })),
    };
  }
  if (Array.isArray(piece?.flags)) {
    properties._Flags = { multi_select: piece.flags.map((f) => ({ name: f })) };
  }
  if (piece.note) {
    properties.Note = { rich_text: [{ text: { content: piece.note } }] };
  }
  if (piece.url) {
    properties.URL = { url: piece.url };
  }
  if (Array.isArray(piece?.fkw)) {
    properties.FreeKeyWord = {
      multi_select: piece.fkw.map((f) => ({ name: f })),
    };
  }
  if (Array.isArray(piece?.prefs)) {
    properties.prefs = {
      multi_select: piece.prefs.map((p) => ({ name: p })),
    };
  }
  if (piece.parent_id) {
    properties.parent_id = {
      rich_text: [{ text: { content: piece.parent_id } }],
    };
  }

  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_PIECE_DS_ID },
    properties,
  });
};

/** Notionの既存 Piece ページを更新する。 */
export const updatePiecePage = async (
  pageId: string,
  piece: UpdatePieceInput,
) => {
  const properties: UpdatePageProperties = {};

  if (piece.title)
    properties.Name = { title: [{ text: { content: piece.title } }] };
  if (piece.status) properties.State = { status: { name: piece.status } };
  if (piece.area) properties._Area = { select: { name: piece.area } };
  if (piece.type) properties._Type = { select: { name: piece.type } };

  if (piece.topics !== undefined) {
    properties._Topics = {
      multi_select: piece.topics.map((t) => ({ name: t })),
    };
  }
  if (piece.flags !== undefined) {
    properties._Flags = { multi_select: piece.flags.map((f) => ({ name: f })) };
  }
  if (piece.note !== undefined) {
    properties.Note = {
      rich_text: piece.note ? [{ text: { content: piece.note } }] : [],
    };
  }
  if (hasPieceDateFields(piece)) {
    properties.Date = toNotionDateRange(piece);
  }
  if (piece.url !== undefined) {
    properties.URL = { url: piece.url };
  }
  if (piece.fkw !== undefined) {
    properties.FreeKeyWord = {
      multi_select: piece.fkw.map((f) => ({ name: f })),
    };
  }
  if (piece.prefs !== undefined) {
    properties.prefs = {
      multi_select: piece.prefs.map((p) => ({ name: p })),
    };
  }
  if (piece.parent_id !== undefined) {
    properties.parent_id = {
      rich_text: piece.parent_id
        ? [{ text: { content: piece.parent_id } }]
        : [],
    };
  }

  return await notionClient.pages.update({
    page_id: pageId,
    properties,
  });
};

export const archivePiecePage = async (pageId: string) => {
  return await notionClient.pages.update({
    page_id: pageId,
    archived: true,
  });
};

// Block operations

const listImmediateChildBlocks = async (
  blockId: string,
): Promise<NotionBlockItem[]> => {
  const allBlocks: NotionBlockItem[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const response = await notionClient.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    allBlocks.push(...response.results);
    if (!response.has_more) break;
    cursor = response.next_cursor ?? undefined;
  }

  return allBlocks;
};

/** Notionページの本文ブロックを指定階層数まで取得する（既定 1 階層）。 */
export const getPageBlocks = async (
  pageId: string,
  depth = 1,
): Promise<NotionBlockWithChildren[]> => {
  const levelBlocks = await listImmediateChildBlocks(pageId);
  if (depth <= 1) {
    return levelBlocks;
  }

  return await mapWithConcurrency(
    levelBlocks,
    NOTION_BLOCK_FETCH_CONCURRENCY,
    async (block): Promise<NotionBlockWithChildren> => {
      const hasChildren =
        'has_children' in block &&
        Boolean(block.has_children) &&
        'id' in block &&
        typeof block.id === 'string';
      if (!hasChildren) {
        return block;
      }

      try {
        const childBlocks = await getPageBlocks(block.id, depth - 1);
        return { ...block, children_blocks: childBlocks };
      } catch (error) {
        console.error(
          `[Notion Blocks] Failed to fetch children for block ${block.id}:`,
          error,
        );
        return block;
      }
    },
  );
};

/** Notionページ本文の末尾に通常段落ブロックを追記する。 */
export const appendPageParagraphBlocks = async (
  pageId: string,
  paragraphs: AppendPieceParagraphInput[],
): Promise<NotionBlockItem[]> => {
  const children = paragraphs.map(buildParagraphBlock);
  const response = await notionClient.blocks.children.append({
    block_id: pageId,
    children,
  });
  return response.results;
};

// Review operations

/** 指定した月の Monthly ページを取得する。 */
export const getMonthlyPage = async (yearMonth: string) => {
  const res = await notionClient.dataSources.query({
    data_source_id: NOTION_MONTHLY_DS_ID,
    filter: { property: 'Name', title: { equals: yearMonth } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

/** Monthly ページを作成する。 */
export const insertMonthlyPage = async (
  yearMonth: string,
  startDate: string,
) => {
  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_MONTHLY_DS_ID },
    properties: {
      Name: { title: [{ text: { content: yearMonth } }] },
      StartDate: { date: { start: startDate } },
    },
  });
};

/** 指定した週の Weekly ページを取得する。 */
export const getWeeklyPage = async (weekName: string) => {
  const res = await notionClient.dataSources.query({
    data_source_id: NOTION_WEEKLY_DS_ID,
    filter: { property: 'Name', title: { equals: weekName } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

/** Weekly ページを作成する。 */
export const insertWeeklyPage = async (weekName: string, startDate: string) => {
  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_WEEKLY_DS_ID },
    properties: {
      Name: { title: [{ text: { content: weekName } }] },
      StartDate: { date: { start: startDate } },
    },
  });
};

/** Notionページのテキストプロパティを更新する。 */
export const updatePageTextProperty = async (
  pageId: string,
  propertyName: string,
  text: string,
) => {
  return await notionClient.pages.update({
    page_id: pageId,
    properties: {
      [propertyName]: { rich_text: [{ text: { content: text } }] },
    },
  });
};
