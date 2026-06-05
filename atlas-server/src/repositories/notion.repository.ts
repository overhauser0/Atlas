import { Client } from '@notionhq/client';
import { Piece } from '../schemas/piece.schema';

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const NOTION_MONTHLY_DB_ID = process.env.NOTION_MONTHLY_DB_ID!;
const NOTION_WEEKLY_DB_ID = process.env.NOTION_WEEKLY_DB_ID!;

// ---- Piece(Piece)関連のNotion操作 ----
/**
 * Notionに新しいページを作成する
 */
export const createPage = async (piece: Piece) => {
  const properties: any = {
    Name: { title: [{ text: { content: piece.title } }] },
    State: { status: { name: piece.status || 'INBOX' } },
    _Area: { select: { name: piece.area || 'Work' } },
    _Type: { select: { name: piece.type || 'Task' } },
    Date: piece.date ? { date: { start: piece.date } } : undefined,
  };
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
  return await notionClient.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });
};

/**
 * Notionの既存ページを更新する
 */
export const updatePage = async (pageId: string, piece: Partial<Piece>) => {
  const properties: any = {};
  if (piece.title)
    properties.Name = { title: [{ text: { content: piece.title } }] };
  if (piece.status) properties.State = { status: { name: piece.status } };
  if (piece.area) properties._Area = { select: { name: piece.area } };
  if (piece.type) properties._Type = { select: { name: piece.type } };
  if (piece.topics)
    properties._Topics = {
      multi_select: piece.topics.map((t) => ({ name: t })),
    };
  if (piece.flags)
    properties._Flags = { multi_select: piece.flags.map((f) => ({ name: f })) };
  if (piece.note)
    properties.Note = { rich_text: [{ text: { content: piece.note } }] };
  if (piece.date !== undefined) {
    properties.Date = { date: piece.date ? { start: piece.date } : null };
  }
  if (piece.url !== undefined) {
    properties.URL = { url: piece.url };
  }

  return await notionClient.pages.update({
    page_id: pageId,
    properties,
  });
};

/**
 * Notionから全データを取得する（同期用）
 */
export const fetchAllPages = async () => {
  let allPages: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const response: Awaited<ReturnType<typeof notionClient.databases.query>> =
      await notionClient.databases.query({
        database_id: process.env.NOTION_DATABASE_ID!,
        start_cursor: cursor, // 次のページの開始位置を指定
        page_size: 100,
      });

    allPages = [...allPages, ...response.results];
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return allPages;
};

/**
 * ページIDを指定して本文（ブロック）を取得する
 */
export const getPageBlocks = async (pageId: string) => {
  let allBlocks: any[] = [];
  let cursor: string | undefined = undefined;

  // 100件以上のブロックがある場合に対応するためループ処理
  while (true) {
    const response = await notionClient.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100, // 1回あたりの最大取得件数
    });

    allBlocks.push(...response.results);

    if (!response.has_more) {
      break;
    }
    // まだ続きがあればカーソルを更新して次の100件を取得
    cursor = response.next_cursor ?? undefined;
  }

  return allBlocks;
};

// ---- レビュー関連のNotion操作 ----
/**
 * Monthlyページを名前（例: "202605"）で検索する
 */
export const findMonthlyPage = async (yearMonth: string) => {
  const res = await notionClient.databases.query({
    database_id: NOTION_MONTHLY_DB_ID,
    filter: { property: 'Name', title: { equals: yearMonth } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

/**
 * Monthlyページを新規作成する
 */
export const createMonthlyPage = async (
  yearMonth: string,
  startDate: string,
) => {
  return await notionClient.pages.create({
    parent: { database_id: NOTION_MONTHLY_DB_ID },
    properties: {
      Name: { title: [{ text: { content: yearMonth } }] },
      StartDate: { date: { start: startDate } },
    },
  });
};

/**
 * Weeklyページを名前（例: "2026-CW18"）で検索する
 */
export const findWeeklyPage = async (weekName: string) => {
  const res = await notionClient.databases.query({
    database_id: NOTION_WEEKLY_DB_ID,
    filter: { property: 'Name', title: { equals: weekName } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

/**
 * Weeklyページを新規作成する
 */
export const createWeeklyPage = async (weekName: string, startDate: string) => {
  return await notionClient.pages.create({
    parent: { database_id: NOTION_WEEKLY_DB_ID },
    properties: {
      Name: { title: [{ text: { content: weekName } }] },
      StartDate: { date: { start: startDate } },
    },
  });
};

/**
 * ページの特定のテキストプロパティ（Business, Life, Summaryなど）を更新する
 */
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
