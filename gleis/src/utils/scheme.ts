export const VALID_LINKTYPES = [
  'view',
  'action',
  'task',
  'document',
  'unknown',
] as const;

export type LinkType = (typeof VALID_LINKTYPES)[number];

export const isLinkType = (type: string): type is LinkType => {
  return (VALID_LINKTYPES as readonly string[]).includes(type);
};

export interface GleisLinkAction {
  type: LinkType;
  target: string;
  rawUrl: string;
}

/**
 * gleis:// スキームのURLを解析する純粋関数
 */
export const parseGleisLink = (url: string): GleisLinkAction | null => {
  if (!url || !url.startsWith('gleis://')) return null;

  try {
    const urlObj = new URL(url);
    const type = urlObj.hostname;
    const target = urlObj.pathname.replace('/', '');

    if (isLinkType(type)) {
      return {
        type,
        target,
        rawUrl: url,
      };
    }

    return { type: 'unknown', target: '', rawUrl: url };
  } catch (e) {
    console.warn('Invalid gleis:// URL scheme:', e);
    return null;
  }
};
