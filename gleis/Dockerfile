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

# パッケージインストールとビルド
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ==========================================
# 2. 本番実行用（Runner）- ここが超軽量になる
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production

# standaloneモードで抽出された必要最小限のファイルだけをコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 5676
ENV PORT 5676

# npm startではなく、nodeで直接サーバーを叩く（超高速）
CMD ["node", "server.js"]