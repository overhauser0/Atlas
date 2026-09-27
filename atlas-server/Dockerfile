FROM node:20-slim
WORKDIR /app

# 1. パッケージのインストール
COPY package*.json ./
RUN npm install

# 2. ソースコードをコンテナ内にすべてコピー（本番環境では必須）
COPY . .

# 3. 💡 （オプション）TypeScriptのビルド等があれば実行
# もし package.json に "build" スクリプトがあれば、ここでコンパイルしておきます
RUN npm run build 

# 4. 💡 起動コマンドを本番用に変更
# npm run dev ではなく、本番起動用のコマンド（npm start等）に切り替えます
CMD ["npm", "start"]