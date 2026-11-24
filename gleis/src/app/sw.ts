import {
  Serwist,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
} from 'serwist';
import type { PrecacheEntry } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 0. 認証・PDF閲覧エンドポイントは絶対にキャッシュしない
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/auth/') ||
        url.pathname.startsWith('/api/paperless/'),
      handler: new NetworkOnly(),
    },

    // 1. Piece (タスク・メモ等) API
    // 確実な最新データを優先しつつ、オフライン時はキャッシュを返す
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/atlas/pieces'),
      handler: new NetworkFirst({
        cacheName: 'api-pieces-cache',
        networkTimeoutSeconds: 3, // 3秒応答がなければキャッシュにフォールバック
      }),
    },

    // 2. AI Agent API / 設定
    // AIのレスポンスはキャッシュせず常にネットワークから取得する
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/atlas/ai'),
      handler: new NetworkOnly(),
    },

    // 3. アラーム用メディア資産 (音声ファイルなど)
    // オフラインでも確実にアラームを鳴らすために強力にキャッシュ
    {
      matcher: ({ request }) =>
        request.destination === 'audio' || request.destination === 'video',
      handler: new CacheFirst({
        cacheName: 'media-assets',
      }),
    },

    // 4. 静的資産 (JS / CSS)
    {
      matcher: ({ request }) =>
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'worker',
      handler: new StaleWhileRevalidate({
        cacheName: 'static-resources',
      }),
    },

    // 5. 画像 (SVGアイコン等)
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'images',
      }),
    },

    // 6. フォント
    {
      matcher: ({ request }) => request.destination === 'font',
      handler: new CacheFirst({
        cacheName: 'fonts',
      }),
    },
  ],
});

serwist.addEventListeners();
