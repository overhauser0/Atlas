// atlas-server/src/repositories/notion.repository.ts

import { Client } from '@notionhq/client';
import { DbPiece, UpdatePieceInput } from '../models/piece.model';

// Notion API configuration

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });
const NOTION_PIECE_DS_ID = process.env.NOTION_PIECE_DS_ID!;
const NOTION_MONTHLY_DS_ID = process.env.NOTION_MONTHLY_DS_ID!;
const NOTION_WEEKLY_DS_ID = process.env.NOTION_WEEKLY_DS_ID!;

// Piece operations

const hasPieceDateFields = (piece: Partial<DbPiece>) =>
  piece.start_date !== undefined ||
  piece.start_time !== undefined ||
  piece.end_date !== undefined ||
  piece.end_time !== undefined;

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

  return `${datePart}${time ? `T${time}+09:00` : ''}`;
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

/** Notionページの本文ブロックをすべて取得する。 */
export const getPageBlocks = async (
  pageId: string,
): Promise<NotionBlockItem[]> => {
  const allBlocks: NotionBlockItem[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const response = await notionClient.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    allBlocks.push(...response.results);
    if (!response.has_more) break;
    cursor = response.next_cursor ?? undefined;
  }

  return allBlocks;
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
