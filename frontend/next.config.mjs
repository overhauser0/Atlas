//import withSerwistInit from "@serwist/next";

// 💡 Serwistの設定
/*
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts", // Service Workerのソースファイル（後ほど作成）
  swDest: "public/sw.js", // ビルド後の出力先
});
*/

/** @type {import('next').NextConfig} */
/*
const nextConfig = {
  // 💡 既存のrewrites設定をそのまま保持
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5676/api/:path*", // LAN内のバックエンドIP
      },
    ];
  },
};

// 💡 既存の設定を withSerwist で包んでエクスポート
export default withSerwist(nextConfig);
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ポート統一のためのリライト設定のみ残す
  async rewrites() {
    return [
      {
        // 1. API関連の転送
        source: "/api/:path*",
        destination: "http://backend:5676/api/:path*",
      },
      {
        // 2. ヘルスチェック用の転送を追加
        source: "/health",
        destination: "http://backend:5676/health",
      },
    ];
  },
};

export default nextConfig;
