//import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ポート統一のためのリライト設定のみ残す
  async rewrites() {
    return [
      {
        // 1. API関連の転送
        source: '/api/:path*',
        destination: 'http://atlas-server:5676/api/:path*',
      },
      {
        // 2. ヘルスチェック用の転送を追加
        source: '/health',
        destination: 'http://atlas-server:5676/health',
      },
    ];
  },
};

export default nextConfig;
