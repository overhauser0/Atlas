import { z } from 'zod';
import {
  Generated,
  JSONColumnType,
  Selectable,
  Insertable,
  Updateable,
} from 'kysely';

// ==========================================
// 1. Zod Schemas (APIバリデーション用)
// ==========================================

// Webプッシュ通知送信用の入力スキーマ
export const PushNotificationInputSchema = z.object({
  // 通知の基本情報
  title: z.string().min(1, 'タイトルは必須です'),
  note: z.string().default(''),

  // 分類（大文字で統一）
  category: z.enum(['TASK', 'ALERT', 'INFO']).default('INFO'),

  // 保存先。Service層での分岐に使用
  storageTarget: z.enum(['NOTION', 'LOCAL', '']).default(''),

  url: z
    .string()
    .url('正しいURL形式で入力してください')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),

  // 拡張データ（topicsやflagsなど、Taskスキーマに変換する際のソースを含む）
  metadata: z
    .object({
      id: z.string().optional(),
      topics: z.array(z.string()).default([]),
      flags: z.array(z.string()).default([]),
      url: z.string().url().optional(),
    })
    .optional()
    .nullable()
    .default({}),

  // 発生時刻
  timestamp: z
    .string()
    .datetime()
    .nullable()
    .default(() => new Date().toISOString()),
});

// DBに保存する通知履歴用のスキーマ
export const NotificationSchema = z.object({
  title: z.string().min(1),
  note: z.string().default(''),
  url: z.string().default(''),
  category: z.string().default('info'),
  metadata: z.record(z.any()).optional().nullable(),
  is_read: z.boolean().default(false),
});

export const CreateNotificationSchema = NotificationSchema;
export const UpdateNotificationSchema = NotificationSchema.partial();

// ==========================================
// 2. TypeScript Types (アプリ内で使い回す基本型)
// ==========================================

export type PushNotificationInput = z.infer<typeof PushNotificationInputSchema>;
export type NotificationItem = z.infer<typeof NotificationSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;

// ==========================================
// 3. Database Table Interfaces (Kysely用)
// ==========================================

export interface NotificationsTable {
  id: Generated<string>;
  title: string;
  note: string;
  url: string;
  category: string;
  metadata: JSONColumnType<any> | null;
  created_at: Generated<Date>;
  is_read: Generated<boolean>;
}

export type NotificationRow = Selectable<NotificationsTable>;
export type NewNotificationRow = Insertable<NotificationsTable>;
export type NotificationUpdateRow = Updateable<NotificationsTable>;
