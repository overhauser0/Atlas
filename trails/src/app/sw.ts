/// <reference lib="webworker" />

import {
  Serwist,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
  ExpirationPlugin,
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
    // 1. API通信 (Tasks, LifeItems, Notion連携などすべて)
    {
      // /api/ から始まるすべてのGETリクエストを対象にする
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      // NetworkFirst: 常に最新データを取得しにいく。オフライン時やエラー時のみキャッシュを返す
      handler: new NetworkFirst({
        cacheName: 'api-data-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50, // APIレスポンスは最大50件まで保存
            maxAgeSeconds: 24 * 60 * 60, // 24時間で破棄
          }),
        ],
        // ネットワークの応答が3秒遅ければ、諦めてキャッシュを返す（UX向上）
        networkTimeoutSeconds: 3,
      }),
    },
    // 2. 静的資産 (JS / CSS)
    {
      matcher: ({ request }) =>
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'worker',
      // StaleWhileRevalidate: まずキャッシュを返しつつ、裏で最新版を取りに行く（表示スピード最優先）
      handler: new StaleWhileRevalidate({
        cacheName: 'static-resources',
      }),
    },
    // 3. 画像 (SVGアイコン, Notionから取得した画像など)
    {
      // ローカルの画像だけでなく、Notionの外部画像URLにも対応できるようにする
      matcher: ({ request, url }) =>
        request.destination === 'image' ||
        url.origin.includes('amazonaws.com') || // NotionのS3画像対応
        url.origin.includes('notion.so'),
      // CacheFirst: 一度取得した画像は極力キャッシュから返す
      handler: new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100, // 画像が増えすぎてスマホの容量を圧迫しないように100枚上限
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1週間で破棄
            purgeOnQuotaError: true, // ストレージ容量が厳しい場合は自動削除
          }),
        ],
      }),
    },
    // 4. フォント
    {
      matcher: ({ request }) => request.destination === 'font',
      handler: new CacheFirst({
        cacheName: 'fonts-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // フォントは1年間キャッシュ
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
