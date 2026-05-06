import { Context } from "hono";
import { PushNotificationSchema } from "../schemas/push.schema";
import * as notificationService from "../services/notification.service";

export const receivePush = async (c: Context) => {
  const body = await c.req.json();
  const result = PushNotificationSchema.safeParse(body);

  if (!result.success) {
    return c.json({ status: "ERROR", errors: result.error.format() }, 400);
  }

  try {
    const data = await notificationService.handleExternalPush(result.data);
    return c.json({ status: "ACCEPTED", data }, 202);
  } catch (error: any) {
    // ★ エラーの正体をログに書き出す
    console.error("❌ Push Controller Error:", error.message || error);
    return c.json(
      {
        status: "INTERNAL_SERVER_ERROR",
        message: error.message,
      },
      500,
    );
  }
};
