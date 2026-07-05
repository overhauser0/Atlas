import { Client } from '@notionhq/client';
import { DbPiece } from '../schemas/piece.schema';
import { DbDiary } from '../schemas/diary.schema';
import { NotionDiaryItem } from '../schemas/diary.schema';

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

/**
 * [Read] NotionのPieceデータベースから全件取得する（同期用）
 */
export const getPiecePages = async () => {
  let allPages: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const response: Awaited<ReturnType<typeof notionClient.dataSources.query>> =
      await notionClient.dataSources.query({
        data_source_id: NOTION_PIECE_DS_ID,
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
 * [Create] NotionのPieceデータベースに新しいページを作成する
 * @param piece 作成するPieceのデータ
 */
export const insertPiecePage = async (piece: DbPiece) => {
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
 * @param pageId Notion Page ID
 * @param piece 更新するPieceのデータ(差分)
 */
export const updatePiecePage = async (
  pageId: string,
  piece: Partial<DbPiece>,
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
    properties._Flags = {
      multi_select: piece.flags.map((f) => ({ name: f })),
    };
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

/**
 * [Delete] Notionのページをアーカイブ（論理削除）する
 * @param pageId Notion Page ID
 */
export const archivePiecePage = async (pageId: string) => {
  return await notionClient.pages.update({
    page_id: pageId,
    archived: true, // これをtrueにすることでNotionのゴミ箱に入ります
  });
};

// ==========================================
// 3. Blocks (ページ本文) 関連の操作
// ==========================================

/**
 * [Read] ページIDを指定して本文（ブロック）を取得する
 * @param pageId Notion Page ID
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

// ==========================================
// 4. Review (Monthly / Weekly) 関連の操作
// ==========================================

/**
 * [Read] Monthlyページを名前（例: "202605"）で検索・取得する
 * @param yearMonth 検索対象の年月文字列
 */
export const getMonthlyPage = async (yearMonth: string) => {
  const res = await notionClient.dataSources.query({
    data_source_id: NOTION_MONTHLY_DS_ID,
    filter: { property: 'Name', title: { equals: yearMonth } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

/**
 * [Create] Monthlyページを新規作成する
 * @param yearMonth 作成する年月文字列（タイトル）
 * @param startDate 対象月の開始日
 */
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

/**
 * [Read] Weeklyページを名前（例: "2026-CW18"）で検索・取得する
 * @param weekName 検索対象の週文字列
 */
export const getWeeklyPage = async (weekName: string) => {
  const res = await notionClient.dataSources.query({
    data_source_id: NOTION_WEEKLY_DS_ID,
    filter: { property: 'Name', title: { equals: weekName } },
  });
  return res.results.length > 0 ? res.results[0] : null;
};

/**
 * [Create] Weeklyページを新規作成する
 * @param weekName 作成する週文字列（タイトル）
 * @param startDate 対象週の開始日
 */
export const insertWeeklyPage = async (weekName: string, startDate: string) => {
  return await notionClient.pages.create({
    parent: { data_source_id: NOTION_WEEKLY_DS_ID },
    properties: {
      Name: { title: [{ text: { content: weekName } }] },
      StartDate: { date: { start: startDate } },
    },
  });
};

/**
 * [Update] ページの特定のテキストプロパティ（Business, Life, Summaryなど）を更新する
 * @param pageId Notion Page ID
 * @param propertyName 更新対象のプロパティ名
 * @param text 更新するテキスト内容
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

// ==========================================
// 5. Diary 関連の操作
// ==========================================

/**
 * [Read] NotionのDiaryデータベースから日記を取得する
 * @param lastSyncTime 指定されている場合、この時間以降に更新されたものだけを取得（差分同期）
 */
export const getDiaryPages = async (
  lastSyncTime?: Date,
): Promise<NotionDiaryItem[]> => {
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
      last_edited_time: {
        on_or_after: lastSyncTime.toISOString(),
      },
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

    const name = props.Name?.title?.[0]?.plain_text || '';
    const date = props.Date?.date?.start || null;
    const rate = props.Rate?.select?.name || null;
    const note = props.Note?.rich_text?.[0]?.plain_text || null;

    return {
      id: page.id,
      name,
      date,
      rate,
      note,
      last_edited_time: page.last_edited_time,
    };
  });
};

/**
 * [Update] Notionの既存Diaryページを更新する
 * @param pageId Notion Page ID
 * @param diary 更新するDiaryのデータ(差分)
 */
export const updateDiaryPage = async (
  pageId: string,
  diary: Partial<DbDiary>,
) => {
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

  return await notionClient.pages.update({
    page_id: pageId,
    properties,
  });
};

/**
 * [Create] NotionのDiaryデータベースに新しいページを作成する
 * @param diary 作成するDiaryのデータ
 */
export const insertDiaryPage = async (diary: DbDiary) => {
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

/**
 * [Create/Update] NotionのDiaryデータベースに日記を保存（新規作成または更新）する ※要らないはず
 * @param diary 保存する日記データ
 * @param existingPageId 既存のページID（更新の場合に指定）
 */
export const saveDiaryPage = async (
  diary: Omit<NotionDiaryItem, 'id' | 'lastEditedTime'>,
  existingPageId?: string,
) => {
  if (!NOTION_DIARY_DS_ID)
    throw new Error('NOTION_DIARY_DATABASE_ID is not defined');

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

  if (existingPageId) {
    // 既存ページの更新
    return await notionClient.pages.update({
      page_id: existingPageId,
      properties,
    });
  } else {
    // 新規作成
    return await notionClient.pages.create({
      parent: { data_source_id: NOTION_DIARY_DS_ID },
      properties,
    });
  }
};
