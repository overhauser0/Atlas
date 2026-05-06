-- 既存のテーブルがあれば削除 (クリーンな初期化用)
DROP TABLE IF EXISTS notion_tasks_cache;
DROP TABLE IF EXISTS local_tasks;
DROP TABLE IF EXISTS notifications;

-- 1. 外部からのプッシュ通知履歴 (監査ログ用)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL, -- TASK, ALERT, INFO
    priority INTEGER NOT NULL DEFAULT 3,
    metadata JSONB DEFAULT '{}', -- 拡張データ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notionデータのローカルキャッシュ (高速表示用)
CREATE TABLE notion_tasks_cache (
    id TEXT PRIMARY KEY, -- NotionのPage IDをそのまま使用
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 3,
    area TEXT NOT NULL,
    type TEXT NOT NULL,
    topics TEXT[] DEFAULT '{}', -- 文字列配列
    flags TEXT[] DEFAULT '{}',  -- 文字列配列
    due_date TIMESTAMP WITH TIME ZONE,
    last_edited_time TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB DEFAULT '{}' -- Notion APIからの生レスポンス
);

-- 3. ローカル専用タスク (Notionと同期しないもの)
CREATE TABLE local_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'INBOX',
    priority INTEGER NOT NULL DEFAULT 3,
    area TEXT NOT NULL DEFAULT 'Work',
    type TEXT NOT NULL DEFAULT 'Task',
    topics TEXT[] DEFAULT '{}',
    flags TEXT[] DEFAULT '{}',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成 (検索・ソートの高速化)
CREATE INDEX idx_notion_last_edited ON notion_tasks_cache (last_edited_time DESC);
CREATE INDEX idx_notifications_created ON notifications (created_at DESC);