import { Serwist, StaleWhileRevalidate, CacheFirst } from "serwist";
import type { PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Notion API (WorkOSの心臓部)
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/tasks"),
      handler: new StaleWhileRevalidate({
        cacheName: "api-tasks-cache",
      }),
    },
    // 2. 静的資産 (JS / CSS)
    {
      matcher: ({ request }) =>
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "worker",
      handler: new StaleWhileRevalidate({
        cacheName: "static-resources",
      }),
    },
    // 3. 画像 (SVGアイコン等)
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new CacheFirst({
        cacheName: "images",
      }),
    },
    // 4. フォント
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new CacheFirst({
        cacheName: "fonts",
      }),
    },
  ],
});

serwist.addEventListeners();
