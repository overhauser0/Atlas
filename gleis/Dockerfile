# ==========================================
# 1. 依存関係のインストール（Builder）
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

# ビルド引数
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_KEY
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# モノレポ（npm Workspaces）の依存関係をインストール
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY gleis/package.json ./gleis/
COPY trails/package.json ./trails/
RUN npm ci

# 共通パッケージと Gleis のソースをコピーしてビルド
COPY packages/shared ./packages/shared
COPY gleis ./gleis
RUN npm run build --workspace=gleis

# ==========================================
# 2. 本番実行用（Runner）- ここが超軽量になる
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# standaloneモードで抽出された必要最小限のファイルだけをコピー
COPY --from=builder /app/gleis/public ./gleis/public
COPY --from=builder /app/gleis/.next/standalone ./
COPY --from=builder /app/gleis/.next/static ./gleis/.next/static

EXPOSE 5676
ENV PORT=5676

# npm startではなく、nodeで直接サーバーを叩く（超高速）
CMD ["node", "gleis/server.js"]