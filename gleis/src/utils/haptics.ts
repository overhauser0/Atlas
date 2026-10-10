/**
 * モバイル端末に軽い触覚フィードバック（バイブレーション）を送る
 * @param ms 振動させる時間（ミリ秒）。デフォルトは「コツッ」感の出る 10〜15ms
 */
export const triggerHaptics = (ms: number | number[] = 12) => {
  if (
    typeof window !== 'undefined' &&
    'navigator' in window &&
    'vibrate' in navigator
  ) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // ブラウザの制約等で失敗した場合はサイレントに無視
    }
  }
};
