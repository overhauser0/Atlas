"use client";
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "info" | "alert";
  url?: string;
}

const ToastContext = createContext<{
  addToast: (msg: string, type?: "info" | "alert") => void;
}>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: "info" | "alert" = "info") => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000); // 5秒で自動消去
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-xs px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => t.url && window.open(t.url, "_blank")} // 💡 クリックでURLを開く
            className={`noir-glass p-4 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300 ${
              t.url ? "cursor-pointer hover:border-white/30" : ""
            } ${
              t.type === "alert"
                ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                : "border-white/10"
            }`}
          >
            <span className="text-sm font-medium text-white">{t.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((toast) => toast.id !== t.id))
              }
              className="ml-4 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
