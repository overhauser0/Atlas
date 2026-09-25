// NotionのURLからページID（UUID形式）を抽出するヘルパー関数
export const extractParentIdFromNotionUrl = (
  url: string | null,
): string | null => {
  if (
    !url ||
    (!url.includes('notion.so') &&
      !url.includes('notion.site') &&
      !url.includes('app.notion.com'))
  ) {
    return null;
  }

  // URLから32桁の16進数（NotionのページID）を抽出
  // 例: https://notion.so/Page-Title-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
  const match = url.match(/(?:-|\/)([a-fA-F0-9]{32})(?:\?|#|$)/);

  if (match && match[1]) {
    const id = match[1];
    // Notion APIの `page.id` と同一フォーマット（8-4-4-4-12）に変換して返す
    return `${id.substring(0, 8)}-${id.substring(8, 12)}-${id.substring(12, 16)}-${id.substring(16, 20)}-${id.substring(20)}`;
  }

  return null;
};
