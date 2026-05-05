import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// マッピングの定義（ロールバックで消えていた部分を復活）
const NOTION_MAPPING = {
  TITLE: "Name", // ※実際のNotionの列名に合わせてください
  DATE: "Date",
  STATUS: "State",
  AREA: "_Area",
  TYPE: "_Type",
  TOPICS: "_Topics",
  FLAGS: "_Flags",
} as const;

// APIから取得したデータをGleisのDB型に変換するマッパー
// backend/src/services/notion.ts

export const fetchUpdatedTasks = async () => {
  let allResults: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  // ① 100件の制限を突破するループ処理（全件取得）
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      // 💡 念のためフィルターで「アーカイブ（ゴミ箱）されていないもの」を明示
      filter: {
        property: NOTION_MAPPING.TITLE,
        title: { is_not_empty: true },
      },
    });

    // 取得したデータを配列に結合していく
    allResults = [...allResults, ...response.results];
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  const tasks = allResults.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      title: p[NOTION_MAPPING.TITLE]?.title[0]?.plain_text || "No Title",
      status:
        p[NOTION_MAPPING.STATUS]?.status?.name ||
        p[NOTION_MAPPING.STATUS]?.select?.name ||
        "INBOX",

      area: p[NOTION_MAPPING.AREA]?.select?.name || null,
      type: p[NOTION_MAPPING.TYPE]?.select?.name || null,
      topics:
        p[NOTION_MAPPING.TOPICS]?.multi_select?.map((s: any) => s.name) || [],
      flags:
        p[NOTION_MAPPING.FLAGS]?.multi_select?.map((s: any) => s.name) || [],

      due_date: p[NOTION_MAPPING.DATE]?.date?.start
        ? p[NOTION_MAPPING.DATE].date.start
        : null,
      last_edited_time: new Date(page.last_edited_time),
      raw_data: JSON.stringify(page),
    };
  });

  // 💡 整形済みタスクと、Notion側に存在する「有効な全ID」を返す
  return {
    tasks,
    validIds: allResults.map((p) => p.id),
  };
};

// 💡 タスク更新（タイトル、日付、ステータス）
export const updateNotionTask = async (
  pageId: string,
  updates: { title?: string; status?: string; due_date?: string | null },
) => {
  const payload: any = { page_id: pageId, properties: {} };

  if (updates.title !== undefined) {
    payload.properties[NOTION_MAPPING.TITLE] = {
      title: [{ text: { content: updates.title } }],
    };
  }
  if (updates.due_date !== undefined) {
    payload.properties[NOTION_MAPPING.DATE] = updates.due_date
      ? { date: { start: updates.due_date } }
      : { date: null };
  }
  if (updates.status !== undefined) {
    payload.properties[NOTION_MAPPING.STATUS] = {
      status: { name: updates.status },
    };
  }

  try {
    if (Object.keys(payload.properties).length > 0) {
      await notion.pages.update(payload);
    }
  } catch (error) {
    // ステータスプロパティが「セレクト型」だった場合のフォールバック
    if (updates.status !== undefined) {
      payload.properties[NOTION_MAPPING.STATUS] = {
        select: { name: updates.status },
      };
      await notion.pages.update(payload);
    } else {
      throw error;
    }
  }
};

// 💡 タスク新規作成（自動で _Area=Work, _Type=Task を付与）
export const createNotionTask = async (
  title: string,
  status: string,
  due_date: string | null,
) => {
  const properties: any = {
    [NOTION_MAPPING.TITLE]: { title: [{ text: { content: title } }] },
    [NOTION_MAPPING.AREA]: { select: { name: "Work" } },
    [NOTION_MAPPING.TYPE]: { select: { name: "Task" } },
  };

  if (due_date) {
    properties[NOTION_MAPPING.DATE] = { date: { start: due_date } };
  }

  try {
    await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        ...properties,
        [NOTION_MAPPING.STATUS]: { status: { name: status } },
      },
    });
  } catch (e) {
    await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        ...properties,
        [NOTION_MAPPING.STATUS]: { select: { name: status } },
      },
    });
  }
};
