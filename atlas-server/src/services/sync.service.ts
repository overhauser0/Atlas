// atlas-server/src/services/sync.service.ts

import * as notionRepo from '../repositories/notion.repository';
import * as pieceRepo from '../repositories/piece.repository';
import * as metadataRepo from '../repositories/metadata.repository';
import { extractParentIdFromNotionUrl } from '../utils/utils';
import { DbPiece } from '../models/piece.model';
import { broadcast } from '../utils/websocket';

interface NotionTextToken {
  plain_text?: string;
}

interface NotionSelectOption {
  name: string;
}

export interface NotionPiecePage {
  id: string;
  last_edited_time?: string;
  properties?: {
    Name?: { title?: NotionTextToken[] };
    Note?: { rich_text?: NotionTextToken[] };
    State?: { status?: { name?: string } | null };
    _Area?: { select?: { name?: string } | null };
    _Type?: { select?: { name?: string } | null };
    _Topics?: { multi_select?: NotionSelectOption[] };
    _Flags?: { multi_select?: NotionSelectOption[] };
    FreeKeyWord?: { multi_select?: NotionSelectOption[] };
    prefs?: { multi_select?: NotionSelectOption[] };
    URL?: { url?: string | null };
    Date?: { date?: { start?: string | null; end?: string | null } | null };
    parent_id?: { rich_text?: NotionTextToken[] };
  };
}

const VALID_STATUSES: ReadonlySet<DbPiece['status']> = new Set([
  'INBOX',
  'Waiting',
  'Going',
  'Wrapper',
  'Canceled',
  'Done',
]);

const VALID_AREAS: ReadonlySet<DbPiece['area']> = new Set(['Work', 'Life']);

const VALID_TYPES: ReadonlySet<DbPiece['type']> = new Set([
  'Task',
  'Note',
  'Event',
  'Memo',
]);

const toPieceStatus = (value?: string): DbPiece['status'] =>
  value && VALID_STATUSES.has(value as DbPiece['status'])
    ? (value as DbPiece['status'])
    : 'INBOX';

const toPieceArea = (value?: string): DbPiece['area'] =>
  value && VALID_AREAS.has(value as DbPiece['area'])
    ? (value as DbPiece['area'])
    : 'Work';

const toPieceType = (value?: string): DbPiece['type'] =>
  value && VALID_TYPES.has(value as DbPiece['type'])
    ? (value as DbPiece['type'])
    : 'Task';

export const parseNotionDate = (value?: string | null) => {
  if (!value) return { date: null, time: null };

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:Z|[+-]\d{2}:\d{2})?)?$/,
  );
  if (!match) {
    throw new Error(`Unsupported Notion Piece date value: ${value}`);
  }
  return { date: match[1], time: match[2] || null };
};

/** Notionページオブジェクトを内部の DbPiece スキーマへ変換する。 */
export const mapNotionPageToDbPiece = (page: NotionPiecePage): DbPiece => {
  const props = page.properties ?? {};
  const url = props.URL?.url || null;
  const start = parseNotionDate(props.Date?.date?.start);
  const end = parseNotionDate(props.Date?.date?.end);

  return {
    id: page.id,
    title: props.Name?.title?.[0]?.plain_text || 'No Title',
    note: props.Note?.rich_text?.[0]?.plain_text || '',
    status: toPieceStatus(props.State?.status?.name),
    area: toPieceArea(props._Area?.select?.name),
    type: toPieceType(props._Type?.select?.name),
    topics: props._Topics?.multi_select?.map((t) => t.name) || [],
    flags: props._Flags?.multi_select?.map((f) => f.name) || [],
    fkw: props.FreeKeyWord?.multi_select?.map((f) => f.name) || [],
    prefs: props.prefs?.multi_select?.map((p) => p.name) || [],
    url,
    start_date: start.date,
    start_time: start.time,
    end_date: end.date,
    end_time: end.time,
    parent_id:
      props.parent_id?.rich_text?.[0]?.plain_text ||
      extractParentIdFromNotionUrl(url),
  };
};

/** Notionの最終同期時刻を取得する。 */
export const getLastSyncTime = async () => {
  return await metadataRepo.getLastSyncTimeByKey('last_notion_sync_time');
};

/** Notionの全データを取得し、ローカルキャッシュを更新する。 */
export const syncNotionToLocal = async () => {
  // 0. 連続同期のガード（前回の同期から60秒以内ならスキップ）
  const lastSyncStr = await metadataRepo.getLastSyncTimeByKey(
    'last_notion_sync_time',
  );
  const lastSyncDate = new Date(lastSyncStr);
  const now = new Date();

  if (now.getTime() - lastSyncDate.getTime() < 60000) {
    return;
  }

  // 1. Notionリポジトリから全ページ（Rawデータ）を取得
  const notionPages = await notionRepo.getPiecePages();

  const activeIds = notionPages.map((p) => p.id);

  const syncResults = await Promise.all(
    notionPages.map(async (rawPage) => {
      const page = rawPage as NotionPiecePage;
      const pieceData = mapNotionPageToDbPiece(page);

      // 3. PostgresリポジトリのUpsert関数を呼び出し、キャッシュを更新
      return await pieceRepo.upsertNotionPieceCache(
        pieceData,
        new Date(page.last_edited_time ?? Date.now()),
      );
    }),
  );

  // 3. ローカルのキャッシュから、Notionに存在しない（削除された）タスクを削除
  await pieceRepo.deleteStaleNotionCache(activeIds);

  // 4. 同期が成功したら時刻を更新する
  await metadataRepo.updateSyncTimeByKey(
    'last_notion_sync_time',
    new Date().toISOString(),
  );

  broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));

  return {
    status: 'SUCCESS',
    count: syncResults.length,
    timestamp: new Date().toISOString(),
  };
};
