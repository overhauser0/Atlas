import { atlasFetch } from './api';

export interface NotionRichTextAnnotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
}

export interface NotionRichTextItem {
  plain_text: string;
  href?: string | null;
  annotations?: NotionRichTextAnnotations;
}

export interface NotionBlockContent {
  rich_text?: NotionRichTextItem[];
  checked?: boolean;
}

export interface NotionBlock {
  id: string;
  type?: string;
  has_children?: boolean;
  children_blocks?: NotionBlock[];
  to_do?: NotionBlockContent;
  [blockType: string]: unknown;
}

export interface AppendPieceParagraphInput {
  timestamp?: string;
  content: string;
}

/** ブロック種別に対応する中身オブジェクトを型安全に取り出す。 */
export const getNotionBlockContent = (
  block: NotionBlock,
): NotionBlockContent | null => {
  if (!block.type) return null;
  const raw = block[block.type];
  if (typeof raw !== 'object' || raw === null) return null;
  return raw as NotionBlockContent;
};

/** Notion Piece（またはブロック）の子ブロックを取得する。depth=2 で最大2階層を一括取得。 */
export const fetchPieceBlocks = async (
  blockId: string,
  options?: { depth?: number; signal?: AbortSignal },
): Promise<NotionBlock[]> => {
  if (!blockId) return [];
  const depth = options?.depth;
  const query =
    typeof depth === 'number' && Number.isInteger(depth) && depth > 1
      ? `?depth=${encodeURIComponent(String(depth))}`
      : '';
  const response = await atlasFetch(
    `/pieces/${encodeURIComponent(blockId)}/blocks${query}`,
    {
      method: 'GET',
      signal: options?.signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Notion blocks (${response.status})`);
  }
  const data = (await response.json()) as { blocks?: NotionBlock[] };
  return Array.isArray(data.blocks) ? data.blocks : [];
};

/** Notion Piece 本文末尾にタイムスタンプ付き段落ブロックを追記する。 */
export const appendPieceBlocks = async (
  pieceId: string,
  paragraphs: AppendPieceParagraphInput[],
): Promise<NotionBlock[]> => {
  const response = await atlasFetch(
    `/pieces/${encodeURIComponent(pieceId)}/blocks`,
    {
      method: 'POST',
      body: JSON.stringify({ paragraphs }),
    },
  );
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      errorBody?.message ||
        `Failed to append Notion blocks (${response.status})`,
    );
  }
  const data = (await response.json()) as { blocks?: NotionBlock[] };
  return Array.isArray(data.blocks) ? data.blocks : [];
};
