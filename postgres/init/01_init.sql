-- 1. 拡張機能の有効化（UUID生成用）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Notionデータキャッシュ用テーブル
-- Notionからの同期データを高速に検索・表示するためのテーブル
CREATE TABLE IF NOT EXISTS notion_pieces_cache (
    id TEXT PRIMARY KEY, -- NotionのIDは文字列のためTEXT
    title TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'INBOX',
    area TEXT NOT NULL DEFAULT 'Work',
    type TEXT NOT NULL DEFAULT 'Task',
    topics TEXT[] DEFAULT '{}',
    flags TEXT[] DEFAULT '{}',
    fkw TEXT[] DEFAULT '{}',
    prefs TEXT[] DEFAULT '{}',
    date TEXT,
    url TEXT,
    last_edited_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB DEFAULT '{}'        -- Notion APIからの生レスポンス保持用
);

-- 3. ローカルタスク用テーブル
-- ローカルに保存するデータ用のテーブル。Notionと同じ構造
CREATE TABLE IF NOT EXISTS local_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'INBOX',
    area TEXT DEFAULT 'Work',
    type TEXT DEFAULT 'Task',
    topics TEXT[] DEFAULT '{}',
    flags TEXT[] DEFAULT '{}',
    fkw TEXT[] DEFAULT '{}',
    prefs TEXT[] DEFAULT '{}',
    date TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'        -- 自由な拡張用（topics, flags, fkw等を格納）
);

-- 4. 通知履歴用テーブル
-- 外部からのプッシュ通知内容を履歴として保持
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    note TEXT,
    category TEXT DEFAULT 'GENERAL',
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. アプリのメタデータ（最終同期時刻など）を保存するテーブル
CREATE TABLE IF NOT EXISTS app_metadata (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期値として 1970年の時刻を入れておく
INSERT INTO app_metadata (key, value) 
VALUES ('last_notion_sync_time', '1970-01-01T00:00:00Z')
ON CONFLICT DO NOTHING;

-- 6. インデックスの作成（検索の高速化）
CREATE INDEX IF NOT EXISTS idx_notion_pieces_area ON notion_pieces_cache(area);
CREATE INDEX IF NOT EXISTS idx_notion_pieces_status ON notion_pieces_cache(status);
CREATE INDEX IF NOT EXISTS idx_notion_pieces_date ON notion_pieces_cache(date);

CREATE INDEX IF NOT EXISTS idx_local_pieces_area ON local_pieces(area);
CREATE INDEX IF NOT EXISTS idx_local_pieces_status ON local_pieces(status);
CREATE INDEX IF NOT EXISTS idx_local_pieces_date ON local_pieces(date);
-- JSONB内部を検索したい場合（上級者向け・必要に応じて）
-- metadata内の特定のキーをよく検索するなら、GINインデックスが最強
CREATE INDEX IF NOT EXISTS idx_local_pieces_metadata ON local_pieces USING GIN (metadata);

-- 通知の既読/未読フラグ（今後カラムを追加予定なら）やカテゴリ検索用
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);