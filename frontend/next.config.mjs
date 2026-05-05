import withSerwistInit from "@serwist/next";

// 💡 Serwistの設定
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts", // Service Workerのソースファイル（後ほど作成）
  swDest: "public/sw.js", // ビルド後の出力先
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 💡 既存のrewrites設定をそのまま保持
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://192.168.13.55:8000/api/:path*", // LAN内のバックエンドIP
      },
    ];
  },
};

// 💡 既存の設定を withSerwist で包んでエクスポート
export default withSerwist(nextConfig);
