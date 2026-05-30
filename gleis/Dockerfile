FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

# 開発環境用
CMD ["npm", "run", "dev"]