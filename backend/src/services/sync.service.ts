import * as notionRepo from "../repositories/notion.repository";
import * as pgRepo from "../repositories/postgres.repository";
import { Task } from "../schemas/task.schema";

/**
 * Notionの全データを取得し、ローカルのPostgresキャッシュを最新状態にする
 */
export const syncNotionToLocal = async () => {
  // 1. Notionリポジトリから全ページ（Rawデータ）を取得
  const notionPages = await notionRepo.fetchAllPages();

  const syncResults = await Promise.all(
    notionPages.map(async (page: any) => {
      const props = page.properties;

      // 2. Notionの型を内部のTaskスキーマにマッピング
      // notion.repository.ts で定義したプロパティ名（_Area等）に準拠
      const taskData: Task = {
        id: page.id,
        title: props.Name?.title[0]?.plain_text || "No Title",
        content: props.Description?.rich_text[0]?.plain_text || "",
        status: (props.Status?.status?.name as any) || "INBOX",
        priority: props.Priority?.number || 3,
        area: (props._Area?.select?.name as any) || "Work",
        type: (props._Type?.select?.name as any) || "Task",
        topics: props._Topics?.multi_select.map((t: any) => t.name) || [],
        flags: props._Flags?.multi_select.map((f: any) => f.name) || [],
        dueDate: props.Date?.date?.start || null,
        source: "NOTION",
      };

      // 3. PostgresリポジトリのUpsert関数を呼び出し、キャッシュを更新
      return await pgRepo.upsertNotionTaskCache(
        taskData,
        new Date(page.last_edited_time),
        page, // 生データも保存
      );
    }),
  );

  return {
    status: "SUCCESS",
    count: syncResults.length,
    timestamp: new Date().toISOString(),
  };
};
