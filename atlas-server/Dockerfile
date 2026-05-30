FROM node:20-slim
WORKDIR /app

# 先にpackage.jsonだけコピーしてインストール（キャッシュを効かせるため）
COPY package*.json ./
RUN npm install

# ソースコードは後からボリュームマウントされるため、開発環境ではここまででOK
CMD ["npm", "run", "dev"]