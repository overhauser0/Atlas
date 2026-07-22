import { Client } from '@notionhq/client';
import { CreatePieceInput, UpdatePieceInput } from '../models/piece.model';
import {
  CreateDiaryInput,
  UpdateDiaryInput,
  DiaryTable,
} from '../models/diary.model';

// ==========================================
// 1. 接続・環境設定
// ==========================================

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });
const NOTION_PIECE_DS_ID = process.env.NOTION_PIECE_DS_ID!;
const NOTION_MONTHLY_DS_ID = process.env.NOTION_MONTHLY_DS_ID!;
const NOTION_WEEKLY_DS_ID = process.env.NOTION_WEEKLY_DS_ID!;
const NOTION_DIARY_DS_ID = process.env.NOTION_DIARY_DS_ID!;

// ==========================================
// 2. Piece (Task/LifeLog) 関連の操作
// ==========================================

export const getPiecePages = async () => {
  let allPages: any[] = [];
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

export const insertPiecePage = async (piece: CreatePieceInput) => {
  const properties: any = {
    Name: { title: [{ text: { content: piece.title } }] },
    State: { status: { name: piece.status || 'INBOX' } },
    _Area: { select: { name: piece.area || 'Work' } },
    _Type: { select: { name: piece.type || 'Task' } },
  };

  if (piece.date !== undefined) {
    properties.Date = { date: piece.date ? { start: piece.date } : null };
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

  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_PIECE_DS_ID },
    properties,
  });
};

/**
 * [Update] Notionの既存Pieceページを更新する
 * 💡 Partial<CreatePieceInput> の代わりに UpdatePieceInput を使用
 */
export const updatePiecePage = async (
  pageId: string,
  piece: UpdatePieceInput,
) => {
  const properties: any = {};

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
  if (piece.date !== undefined) {
    properties.Date = { date: piece.date ? { start: piece.date } : null };
  }
  if (piece.url !== undefined) {
    properties.URL = { url: piece.url };
  }
  if (piece.fkw !== undefined) {
    properties.FreeKeyWord = {
      multi_select: piece.fkw.map((f) => ({ name: f })),
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

// ==========================================
// 3. Blocks (ページ本文) 関連の操作
// ==========================================

export const getPageBlocks = async (pageId: string) => {
  let allBlocks: any[] = [];
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

// ==========================================
// 4. Review (Monthly / Weekly) 関連の操作
// ==========================================

export const getMonthlyPage = async (yearMonth: string) => {
  const res = await notionClient.dataSources.query({
    data_source_id: NOTION_MONTHLY_DS_ID,
    filter: { property: 'Name', title: { equals: yearMonth } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

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

export const getWeeklyPage = async (weekName: string) => {
  const res = await notionClient.dataSources.query({
    data_source_id: NOTION_WEEKLY_DS_ID,
    filter: { property: 'Name', title: { equals: weekName } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

export const insertWeeklyPage = async (weekName: string, startDate: string) => {
  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_WEEKLY_DS_ID },
    properties: {
      Name: { title: [{ text: { content: weekName } }] },
      StartDate: { date: { start: startDate } },
    },
  });
};

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

// ==========================================
// 5. Diary 関連の操作
// ==========================================

export const getDiaryPages = async (
  lastSyncTime?: Date,
): Promise<DiaryTable[]> => {
  if (!NOTION_DIARY_DS_ID)
    throw new Error('NOTION_DIARY_DATABASE_ID is not defined');

  let allPages: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  const queryArgs: any = {
    data_source_id: NOTION_DIARY_DS_ID,
    page_size: 100,
  };

  if (lastSyncTime) {
    queryArgs.filter = {
      timestamp: 'last_edited_time',
      last_edited_time: { on_or_after: lastSyncTime.toISOString() },
    };
  }

  while (hasMore) {
    queryArgs.start_cursor = cursor;
    const response = await notionClient.dataSources.query(queryArgs);

    allPages = [...allPages, ...response.results];
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return allPages.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text || '',
      date: props.Date?.date?.start || null,
      rate: props.Rate?.select?.name || null,
      note: props.Note?.rich_text?.[0]?.plain_text || null,
      last_edited_time: page.last_edited_time,
    };
  });
};

/**
 * [Update] Notionの既存Diaryページを更新する
 * 💡 DbDiary 依存を解消し UpdateDiaryInput を使用
 */
export const updateDiaryPage = async (
  pageId: string,
  diary: UpdateDiaryInput,
) => {
  const properties: any = {};

  if (diary.name) {
    properties.Name = { title: [{ text: { content: diary.name } }] };
  }
  if (diary.date) {
    properties.Date = { date: { start: diary.date } };
  }
  if (diary.rate) {
    properties.Rate = { select: { name: diary.rate } };
  }
  if (diary.note !== undefined && diary.note !== null) {
    properties.Note = { rich_text: [{ text: { content: diary.note } }] };
  }

  return await notionClient.pages.update({
    page_id: pageId,
    properties,
  });
};

/**
 * [Create] NotionのDiaryデータベースに新しいページを作成する
 * 💡 CreateDiaryInput を使用
 */
export const insertDiaryPage = async (diary: CreateDiaryInput) => {
  const properties: any = {
    Name: { title: [{ text: { content: diary.name } }] },
  };

  if (diary.date) {
    properties.Date = { date: { start: diary.date } };
  }
  if (diary.rate) {
    properties.Rate = { select: { name: diary.rate } };
  }
  if (diary.note !== undefined && diary.note !== null) {
    properties.Note = { rich_text: [{ text: { content: diary.note } }] };
  }

  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_DIARY_DS_ID },
    properties,
  });
};
