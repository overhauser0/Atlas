import * as notionRepo from '../repositories/notion.repository';
import * as pgRepo from '../repositories/postgres.repository';
import { Piece } from '../schemas/piece.schema';

// 最終同期時刻を取得する関数
export const getLastSyncTime = async () => {
  return await pgRepo.getLastNotionSyncTime();
};

/**
 * Notionの全データを取得し、ローカルのPostgresキャッシュを最新状態にする
 */
export const syncNotionToLocal = async () => {
  // 0. 連続同期のガード（前回の同期から60秒以内ならスキップ）
  const lastSyncStr = await pgRepo.getLastNotionSyncTime();
  const lastSyncDate = new Date(lastSyncStr);
  const now = new Date();

  if (now.getTime() - lastSyncDate.getTime() < 60000) {
    console.log('Sync skipped: Synced less than 60 seconds ago.');
    return;
  }

  // 1. Notionリポジトリから全ページ（Rawデータ）を取得
  const notionPages = await notionRepo.fetchAllPages();

  const activeIds = notionPages.map((p) => p.id);

  const syncResults = await Promise.all(
    notionPages.map(async (page: any) => {
      const props = page.properties;

      // 2. Notionの型を内部のPieceスキーマにマッピング
      // notion.repository.ts で定義したプロパティ名（_Area等）に準拠
      const pieceData: Piece = {
        id: page.id,
        title: props.Name?.title[0]?.plain_text || 'No Title',
        note: props.Note?.rich_text[0]?.plain_text || '',
        status: (props.State?.status?.name as any) || 'INBOX',
        area: (props._Area?.select?.name as any) || 'Work',
        type: (props._Type?.select?.name as any) || 'Task',
        topics: props._Topics?.multi_select.map((t: any) => t.name) || [],
        flags: props._Flags?.multi_select.map((f: any) => f.name) || [],
        fkw: props.FreeKeyWord?.multi_select.map((f: any) => f.name) || [],
        url: props.URL?.url || null,
        date: props.Date?.date?.start || null,
        source: 'NOTION',
      };

      // 3. PostgresリポジトリのUpsert関数を呼び出し、キャッシュを更新
      return await pgRepo.upsertNotionPieceCache(
        pieceData,
        new Date(page.last_edited_time),
        page, // 生データも保存
      );
    }),
  );

  // 3. ローカルのキャッシュから、Notionに存在しない（削除された）タスクを削除
  await pgRepo.deleteStaleNotionCache(activeIds);

  // 4. 同期が成功したら時刻を更新する
  await pgRepo.updateLastNotionSyncTime(new Date().toISOString());

  return {
    status: 'SUCCESS',
    count: syncResults.length,
    timestamp: new Date().toISOString(),
  };
};
