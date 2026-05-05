// backend/src/schemas/api.schema.ts
import { z } from "zod";

/**
 * WorkOS共通のプッシュ通知スキーマ
 * 送信側（n8n等）はこの形式を守る
 */
export const PushNotificationSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  content: z.string().default(""),
  category: z.enum(["TASK", "ALERT", "INFO"]).default("INFO"),
  priority: z.number().min(1).max(5).default(3),
  // Notionに飛ばすか、Local DBに留めるかのフラグ
  storageTarget: z.enum(["NOTION", "LOCAL", "BOTH"]).default("LOCAL"),
  metadata: z.record(z.any()).optional(),
  timestamp: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

export type PushNotification = z.infer<typeof PushNotificationSchema>;
