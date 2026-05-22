import { Client } from '@notionhq/client';
import { Task } from '../schemas/task.schema';

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const NOTION_MONTHLY_DB_ID = process.env.NOTION_MONTHLY_DB_ID!;
const NOTION_WEEKLY_DB_ID = process.env.NOTION_WEEKLY_DB_ID!;

// ---- Piece(Task)関連のNotion操作 ----
/**
 * Notionに新しいページを作成する
 */
export const createPage = async (task: Task) => {
  const properties: any = {
    Name: { title: [{ text: { content: task.title } }] },
    State: { status: { name: task.status || 'INBOX' } },
    _Area: { select: { name: task.area || 'Work' } },
    _Type: { select: { name: task.type || 'Task' } },
    Date: task.dueDate ? { date: { start: task.dueDate } } : undefined,
  };
  if (Array.isArray(task?.topics)) {
    properties._Topics = {
      multi_select: task.topics.map((t) => ({ name: t })),
    };
  }
  if (Array.isArray(task?.flags)) {
    properties._Flags = { multi_select: task.flags.map((f) => ({ name: f })) };
  }
  if (task.content) {
    properties.Note = { rich_text: [{ text: { content: task.content } }] };
  }
  if (task.url) {
    properties.URL = { url: task.url };
  }
  return await notionClient.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });
};

/**
 * Notionの既存ページを更新する
 */
export const updatePage = async (pageId: string, task: Partial<Task>) => {
  const properties: any = {};
  if (task.title)
    properties.Name = { title: [{ text: { content: task.title } }] };
  if (task.status) properties.State = { status: { name: task.status } };
  if (task.area) properties._Area = { select: { name: task.area } };
  if (task.type) properties._Type = { select: { name: task.type } };
  if (task.topics)
    properties._Topics = {
      multi_select: task.topics.map((t) => ({ name: t })),
    };
  if (task.flags)
    properties._Flags = { multi_select: task.flags.map((f) => ({ name: f })) };
  if (task.content)
    properties.Note = { rich_text: [{ text: { content: task.content } }] };
  if (task.dueDate !== undefined) {
    properties.Date = { date: task.dueDate ? { start: task.dueDate } : null };
  }
  if (task.url !== undefined) {
    properties.URL = { url: task.url };
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
