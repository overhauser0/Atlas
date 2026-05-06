-- 1. 拡張機能の有効化（UUID生成用）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Notionデータキャッシュ用テーブル
-- Notionからの同期データを高速に検索・表示するためのテーブル
CREATE TABLE IF NOT EXISTS notion_tasks_cache (
    id TEXT PRIMARY KEY, -- NotionのIDは文字列のためTEXT
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'INBOX',
    priority INTEGER NOT NULL DEFAULT 3,
    area TEXT NOT NULL DEFAULT 'Work', -- Work, Education, Private等
    type TEXT NOT NULL DEFAULT 'Task', -- Task, Routine, Event等
    topics TEXT[] DEFAULT '{}',        -- Postgresの配列型
    flags TEXT[] DEFAULT '{}',         -- Postgresの配列型
    due_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 空なら今日
    last_edited_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB DEFAULT '{}'        -- Notion APIからの生レスポンス保持用
);

-- 3. 外部プッシュ・ローカルタスク用テーブル
-- PWAや外部API（curl等）から直接入ってくるデータ用
CREATE TABLE IF NOT EXISTS local_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    area TEXT DEFAULT 'Work',
    type TEXT DEFAULT 'Task',
    status TEXT DEFAULT 'Todo',
    priority INTEGER DEFAULT 3,
    due_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'        -- 自由な拡張用（topics, flags等を格納）
);

-- 4. 通知履歴用テーブル
-- 外部からのプッシュ通知内容を履歴として保持
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'GENERAL',
    priority INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. インデックスの作成（検索の高速化）
CREATE INDEX IF NOT EXISTS idx_notion_tasks_area ON notion_tasks_cache(area);
CREATE INDEX IF NOT EXISTS idx_notion_tasks_status ON notion_tasks_cache(status);
CREATE INDEX IF NOT EXISTS idx_notion_tasks_due_date ON notion_tasks_cache(due_date);