import express from "express";
import cors from "cors";
import * as pushController from "./controllers/push.controller";
import * as taskController from "./controllers/task.controller";

const app = express();
app.use(cors());
app.use(express.json());

// --- Routes ---

// 1. Push Webhook (n8n等からの入り口)
app.post("/api/v1/push", pushController.receivePush);

// 2. Tasks (PWAダッシュボードからの操作)
app.get("/api/v1/tasks", taskController.getTasks);
app.post("/api/v1/tasks/sync", taskController.syncTasks);

// 3. Health Check (System)
app.get("/health", (req, res) => res.json({ status: "UP", time: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Gleis WorkOS Server running on port ${PORT}`);
});
