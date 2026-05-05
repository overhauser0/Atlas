import { Request, Response } from "express";
import { PushNotificationSchema } from "../schemas/api.schema";
import * as notificationService from "../services/notification.service";

export const receivePush = async (req: Request, res: Response) => {
  // Zodバリデーション
  const result = PushNotificationSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ status: "ERROR", errors: result.error.format() });
  }

  try {
    const data = await notificationService.handleExternalPush(result.data);
    return res.status(202).json({ status: "ACCEPTED", data });
  } catch (error) {
    return res.status(500).json({ status: "INTERNAL_SERVER_ERROR" });
  }
};
