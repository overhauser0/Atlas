import { z } from 'zod';

/**
 * 外部（n8n, 自作ツール等）から /api/v1/push に送られてくるデータのバリデーションスキーマ
 */
export const PushNotificationSchema = z.object({
  // 通知の基本情報
  title: z.string().min(1, 'タイトルは必須です'),
  note: z.string().default(''),

  // 分類（大文字で統一）
  category: z.enum(['TASK', 'ALERT', 'INFO']).default('INFO'),

  // 優先度 (1: 低 〜 5: 緊急)
  priority: z.number().int().min(1).max(5).default(3),

  // 保存先。Service層での分岐に使用
  storageTarget: z.enum(['NOTION', 'LOCAL', '']).default(''),

  // 拡張データ（topicsやflagsなど、Taskスキーマに変換する際のソースを含む）
  metadata: z
    .object({
      id: z.string().optional(),
      topics: z.array(z.string()).default([]),
      flags: z.array(z.string()).default([]),
      url: z.string().url().optional(),
    })
    .optional()
    .default({}),

  // 発生時刻
  timestamp: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

export type PushNotification = z.infer<typeof PushNotificationSchema>;

export type PushNotificationInput = z.input<typeof PushNotificationSchema>;
