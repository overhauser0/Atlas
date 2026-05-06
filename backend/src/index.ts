import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import * as pushController from "./controllers/push.controller";
import * as taskController from "./controllers/task.controller";

const app = new Hono();

// Middleware
app.use("/*", cors());

// Routes
app.get("/health", (c) => c.json({ status: "UP", time: new Date() }));

// /api/v1 プレフィックスで整理
const api = new Hono();
api.post("/push", pushController.receivePush);
api.get("/tasks", taskController.getTasks);
api.post("/tasks/sync", taskController.syncTasks);

app.route("/api/v1", api);

const port = 5676;
console.log(`🚀 Gleis WorkOS Backend (Hono) running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
