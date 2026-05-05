-- 拡張機能（UUID生成用）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Notionタスク・キャッシュテーブル
CREATE TABLE notion_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    area TEXT,                  -- 追加: _Area (セレクト)
    type TEXT,                  -- 追加: _Type (セレクト)
    topics TEXT[],              -- 追加: _Topics (マルチセレクトを配列で保存)
    flags TEXT[],               -- 追加: _Flags (マルチセレクトを配列で保存)
    due_date DATE,
    last_edited_time TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- 2. ローカル専用タスクテーブル
CREATE TABLE local_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('INBOX', 'Waiting', 'Going', 'Done')),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 通知ログテーブル
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    source TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. システム管理テーブル
CREATE TABLE system_meta (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（検索の高速化）
CREATE INDEX idx_notion_due_date ON notion_tasks (due_date);
CREATE INDEX idx_local_due_date ON local_tasks (due_date);