export interface GleisLinkAction {
  type: 'view' | 'action' | 'unknown';
  target: string; // 'review', 'calendar', 'sync' など
  rawUrl: string;
}

/**
 * gleis:// スキームのURLを解析する純粋関数
 */
export const parseGleisLink = (url: string): GleisLinkAction | null => {
  if (!url || !url.startsWith('gleis://')) return null;

  try {
    const urlObj = new URL(url);
    const type = urlObj.hostname; // 'view' や 'action'
    const target = urlObj.pathname.replace('/', ''); // '/review' -> 'review'

    if (type === 'view' || type === 'action') {
      return {
        type: type as 'view' | 'action',
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
