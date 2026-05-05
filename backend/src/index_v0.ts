import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./services/db";
import { v4 as uuidv4 } from "uuid";
import {
  fetchUpdatedTasks,
  updateNotionTask,
  createNotionTask,
} from "./services/notion";

const app = new Hono();

app.use("/api/*", cors());

// ① タスク一覧を取得
app.get("/api/tasks", async (c) => {
  try {
    const notionTasks = await db
      .selectFrom("notion_tasks")
      .selectAll()
      .where("status", "!=", "Done")
      .execute();
    const localTasks = await db.selectFrom("local_tasks").selectAll().execute();

    const unifiedTasks = [
      ...notionTasks.map((t) => ({ ...t, source: "notion" as const })),
      ...localTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        area: null,
        type: null,
        topics: [],
        flags: [],
        due_date: t.due_date,
        source: "local" as const,
      })),
    ];
    return c.json({ success: true, tasks: unifiedTasks });
  } catch (error) {
    return c.json({ error: "Failed to fetch tasks" }, 500);
  }
});

// ② タスクの更新 (Notion / Local 共通)
app.patch("/api/tasks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    let updatedTask = null;

    if (body.source === "notion") {
      // Notion側の更新ロジック
      await updateNotionTask(id, {
        title: body.title,
        status: body.status,
        due_date: body.due_date,
      });

      // 💡 .returningAll() を追加して、更新後のレコードを直接取得する
      updatedTask = await db
        .updateTable("notion_tasks")
        .set({
          title: body.title,
          status: body.status,
          due_date: body.due_date,
        })
        .where("id", "=", id)
        .returningAll() // 👈 これが重要
        .executeTakeFirst(); // 👈 これで配列ではなくオブジェクト1つが取れる
    } else if (body.source === "local") {
      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.due_date !== undefined) {
        updateData.due_date = body.due_date ? new Date(body.due_date) : null;
      }

      // 💡 ローカルも同様に更新後のレコードを返す
      updatedTask = await db
        .updateTable("local_tasks")
        .set(updateData)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();
    }

    // 💡 万が一見つからなかった場合のガード
    if (!updatedTask) {
      return c.json({ error: "Task not found" }, 404);
    }

    // これでフロントエンドに「最新のタスク情報」が届きます
    return c.json({
      success: true,
      task: { ...updatedTask, source: body.source },
    });
  } catch (error) {
    console.error("Update failed:", error);
    return c.json({ error: "Update failed" }, 500);
  }
});

// ③ Notionタスクの新規作成 (404エラーの修正)
app.post("/api/tasks/notion", async (c) => {
  try {
    const body = await c.req.json();
    await createNotionTask(body.title, body.status, body.due_date);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Create failed" }, 500);
  }
});

// ④ Notionとの同期 (クリーンアップ機能付き)
app.post("/api/sync/notion", async (c) => {
  try {
    const { tasks, validIds } = await fetchUpdatedTasks();
    for (const task of tasks) {
      await db
        .insertInto("notion_tasks")
        .values(task)
        .onConflict((oc) => oc.column("id").doUpdateSet(task))
        .execute();
    }
    if (validIds.length > 0) {
      await db
        .deleteFrom("notion_tasks")
        .where("id", "not in", validIds)
        .execute();
    }
    return c.json({ success: true, synced_count: tasks.length });
  } catch (error) {
    return c.json({ error: "Sync failed" }, 500);
  }
});

// ⑤ ローカルタスクの手動作成
app.post("/api/tasks/local", async (c) => {
  try {
    const body = await c.req.json();
    const id = uuidv4(); // フロントエンドと型を合わせるためUUIDを生成

    const newTask = await db
      .insertInto("local_tasks")
      .values({
        id: id,
        title: body.title,
        status: body.status || "INBOX", // 指定があればそれに従う（D&D作成等に対応）
        due_date: body.due_date ? new Date(body.due_date) : null,
      })
      .returningAll()
      .executeTakeFirst();

    return c.json({ success: true, task: newTask });
  } catch (error) {
    console.error("Local create failed:", error);
    return c.json({ error: "Create failed" }, 500);
  }
});

// 通知処理
// --- 通知管理用のメモリキュー ---
let notificationQueue: any[] = [];

// ⑥ 外部からの通知受信（WebHook用）
app.post("/api/notify", async (c) => {
  try {
    const body = await c.req.json();
    const { title, isTask, date, url, isAlert } = body;

    // セキュリティチェック（任意：運用に合わせてヘッダー等で検証してください）
    /*
    const authHeader = c.req.header("X-Gleis-Auth");
    if (authHeader !== "your-secure-token") {
      // return c.json({ error: "Unauthorized" }, 403); // 必要に応じて有効化
    }
    */

    // A. isTask が true なら local_tasks テーブルに保存
    if (isTask) {
      const taskId = uuidv4(); // 💡 IDを生成してDBとキューで共通化する
      const dueDate = date ? new Date(date) : new Date();

      await db
        .insertInto("local_tasks")
        .values({
          id: taskId, // 💡 IDを保存（DBのカラムがTEXT/VARCHARである必要があります）
          title: title,
          status: "INBOX",
          due_date: dueDate,
        })
        .execute();
    }

    // B. フロントエンド通知用のキューに追加
    notificationQueue.push({
      id: uuidv4(),
      title,
      url,
      isAlert: !!isAlert,
      isTask: !!isTask,
      timestamp: Date.now(),
    });

    return c.json({ success: true, message: "Notification processed" });
  } catch (error) {
    console.error("Notify error:", error);
    return c.json({ error: "Failed to process notification" }, 500);
  }
});

// ⑦ フロントエンドからのポーリング用
app.get("/api/notifications/poll", (c) => {
  const pending = [...notificationQueue];
  notificationQueue = []; // 取得されたら空にする

  return c.json({
    success: true,
    notifications: pending,
  });
});

serve({ fetch: app.fetch, port: 8000 }, (info) => {
  console.log(`Gleis Backend is running on http://localhost:${info.port}`);
});
