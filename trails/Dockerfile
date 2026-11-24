# ==========================================
# 1. 依存関係のインストール（Builder）
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

# ビルド引数
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_IMMICH_URL
ARG NEXT_PUBLIC_GOOGLE_CONTACTS_SYNC_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_IMMICH_URL=$NEXT_PUBLIC_IMMICH_URL
ENV NEXT_PUBLIC_GOOGLE_CONTACTS_SYNC_URL=$NEXT_PUBLIC_GOOGLE_CONTACTS_SYNC_URL

# モノレポ（npm Workspaces）の依存関係をインストール
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY gleis/package.json ./gleis/
COPY trails/package.json ./trails/
RUN npm ci

# 共通パッケージと Trails のソースをコピーしてビルド
COPY packages/shared ./packages/shared
COPY trails ./trails
RUN npm run build --workspace=trails

# ==========================================
# 2. 本番実行用（Runner）- ここが超軽量になる
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# standaloneモードで抽出された必要最小限のファイルだけをコピー
COPY --from=builder /app/trails/public ./trails/public
COPY --from=builder /app/trails/.next/standalone ./
COPY --from=builder /app/trails/.next/static ./trails/.next/static

EXPOSE 5677
ENV PORT=5677

# npm startではなく、nodeで直接サーバーを叩く（超高速）
CMD ["node", "trails/server.js"]