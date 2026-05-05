"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, ExternalLink, X } from "lucide-react";
import { Task } from "@/types";
import {
  COLUMNS,
  getStatusColor,
  getColumnName,
  calculateNewDateWithPreservedTime,
  STATUS_ORDER,
} from "@/utils/dateUtils";

interface Props {
  appSettings: { shrinkEmptyPastDays: boolean };
  isAuthenticated: boolean;
}

export default function DashboardView({ appSettings, isAuthenticated }: Props) {
  const statuses = ["INBOX", "Waiting", "Going", "Done"];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    task: Task | null;
  }>({ isOpen: false, mode: "create", task: null });
  const [editForm, setEditForm] = useState({
    title: "",
    status: "INBOX",
    due_date: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const todayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date().getDay()
  ];

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(
          data.tasks.filter((task: Task) => {
            if (task.source === "local") return task.status != "Done";
            return (
              task.area === "Work" &&
              task.type === "Task" &&
              statuses.includes(task.status || "")
            );
          }),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onDrop = async (targetColumn: string) => {
    if (!draggingTaskId || targetColumn === "Overdue") {
      setDraggingTaskId(null);
      return;
    }
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task) return;
    const newDate = calculateNewDateWithPreservedTime(
      task.due_date,
      targetColumn,
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingTaskId ? { ...t, due_date: newDate } : t,
      ),
    );
    setDraggingTaskId(null);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, due_date: newDate, source: task.source }),
    });
  };

  const openEditModal = (task: Task) => {
    setEditForm({
      title: task.title,
      status: task.status,
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
    });
    setModalConfig({ isOpen: true, mode: "edit", task });
  };

  const handleSave = async () => {
    if (!editForm.title.trim()) return alert("タイトルを入力してください");
    setIsSaving(true);

    try {
      const isEdit = modalConfig.mode === "edit" && modalConfig.task;
      const payloadDate = editForm.due_date || null;

      // 💡 エンドポイントとメソッドの決定
      let url = "";
      let method = "";
      let payload = {};

      if (isEdit) {
        // 【編集モード】既存のIDとソースを引き継ぐ
        url = `/api/tasks/${modalConfig.task.id}`;
        method = "PATCH";
        payload = {
          ...editForm,
          due_date: payloadDate,
          source: modalConfig.task.source, // 既存のソース（notion or local）を維持
        };
      } else {
        // 【新規作成モード】選択されたソースによって送信先を変える
        method = "POST";
        if (editForm.source === "local") {
          url = "/api/tasks/local";
          payload = {
            title: editForm.title,
            status: editForm.status || "INBOX",
            due_date: payloadDate,
            source: editForm.source,
          };
        } else {
          url = "/api/tasks/notion";
          payload = {
            title: editForm.title,
            status: editForm.status || "INBOX",
            due_date: payloadDate,
            source: editForm.source,
          };
        }
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text(); // サーバーからのエラーメッセージを取得
        console.error(`Server responded with ${response.status}: ${errorText}`);
        throw new Error(`Server Error: ${response.status}`);
      }

      const result = await response.json();

      console.log("result", result);
      if (result.success && result.task) {
        // 💡 全部取り直すのではなく、該当するタスクだけをState内で差し替える
        setTasks((prev) => {
          const exists = prev.find((t) => t.id === result.task.id);
          if (exists) {
            // 編集の場合：差し替え
            return prev.map((t) => (t.id === result.task.id ? result.task : t));
          } else {
            // 新規作成の場合：追加
            return [...prev, result.task];
          }
        });
        setModalConfig({ isOpen: false, mode: "create", task: null });
      }
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden px-2 snap-x snap-mandatory flex gap-5 pb-2 
      [&::-webkit-scrollbar]:h-1.5 
      [&::-webkit-scrollbar-track]:bg-transparent 
      [&::-webkit-scrollbar-thumb]:bg-white/10 
      [&::-webkit-scrollbar-thumb]:rounded-full 
      hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full w-full text-gray-400 animate-pulse">
            Loading Tasks...
          </div>
        ) : (
          COLUMNS.map((colName) => {
            // ① フィルタリング
            const filteredTasks = tasks.filter(
              (t) =>
                getColumnName(t.due_date) === colName && t.status !== "Done",
            );

            // ② ソート処理を追加
            const colTasks = filteredTasks.sort((a, b) => {
              const statusA = a.status || "";
              const statusB = b.status || "";

              // ステータスの優先度比較
              const priorityA = STATUS_ORDER[statusA] || 99;
              const priorityB = STATUS_ORDER[statusB] || 99;

              if (priorityA !== priorityB) {
                return priorityA - priorityB;
              }

              // 同一ステータス内の場合はタイトル順（昇順）
              return (a.title || "").localeCompare(b.title || "", "ja");
            });
            const todayIndex = COLUMNS.indexOf(todayName);
            const colIndex = COLUMNS.indexOf(colName);
            const shouldShrink =
              appSettings.shrinkEmptyPastDays &&
              colIndex < todayIndex &&
              colTasks.length === 0;

            return (
              <div
                key={colName}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(colName)}
                className={`${shouldShrink ? "w-[168px]" : "w-[280px]"} flex-shrink-0 flex flex-col gap-4 h-full snap-start transition-[width] duration-300`}
              >
                <div
                  className={`text-sm font-medium pb-2 border-b flex justify-between items-center ${colName === "Overdue" ? "text-red-400 border-red-500/30" : colName === todayName ? "text-neon border-neon/50" : "text-gray-400 border-glass-border"}`}
                >
                  <span>{colName}</span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                    {colTasks.length}
                  </span>
                </div>
                <div
                  className="flex-1 overflow-y-auto pr-2 pb-12 flex flex-col gap-3 
                [&::-webkit-scrollbar]:w-1 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-white/10 
                [&::-webkit-scrollbar-thumb]:rounded-full 
                hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
                >
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingTaskId(task.id)}
                      className={`p-3.5 rounded-xl noir-glass border border-white/5 hover:border-white/10 cursor-grab active:cursor-grabbing transition-all group relative flex flex-col gap-3 ${draggingTaskId === task.id ? "opacity-30 scale-95" : "opacity-100"}`}
                    >
                      {task.source === "notion" && (
                        <a
                          href={`https://notion.so/${task.id.replace(/-/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2.5 right-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <div className="flex items-start gap-2.5 pr-10">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getStatusColor(task.status)}`}
                        />
                        <div className="text-sm font-medium leading-snug flex-1">
                          {task.title}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto h-6">
                        <div className="flex flex-wrap gap-1.5">
                          {task.topics?.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => openEditModal(task)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-[10px] font-medium uppercase px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => {
          setEditForm({
            title: "",
            status: "INBOX",
            due_date: new Date().toISOString().split("T")[0],
          });
          setModalConfig({ isOpen: true, mode: "create", task: null });
        }}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-neon rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,243,0.5)] hover:scale-105 transition-transform z-40 border border-white/20"
      >
        <Plus className="w-8 h-8" />
      </button>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md noir-glass rounded-2xl p-6 border border-white/10 flex flex-col gap-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold text-white">
                {modalConfig.mode === "create" ? "New Task" : "Edit Task"}
              </h2>
              <button
                onClick={() =>
                  setModalConfig({ ...modalConfig, isOpen: false })
                }
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {/* 💡 追加：ソース（保存先）の切り替えスイッチ */}
              {modalConfig.mode === "create" && (
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                  {(["local", "notion"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, source: src })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.2em] transition-all ${
                        editForm.source === src
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-neon focus:outline-none"
                placeholder="Task title..."
              />
              <input
                type="date"
                value={editForm.due_date}
                onChange={(e) =>
                  setEditForm({ ...editForm, due_date: e.target.value })
                }
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-neon focus:outline-none [color-scheme:dark]"
              />
              <div className="grid grid-cols-2 gap-2">
                {["INBOX", "Waiting", "Going", "Done"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditForm({ ...editForm, status: s })}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${editForm.status === s ? "bg-white/10 border-white/30 text-white" : "border-white/5 text-gray-400"}`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getStatusColor(s)}`}
                    />
                    <span className="text-xs">{s}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-neon text-white font-bold py-3 rounded-xl disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Task"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
