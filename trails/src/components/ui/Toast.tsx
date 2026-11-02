'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'alert';
}

interface ToastContextValue {
  addToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = Math.random().toString(36).substring(2);
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 5000);
    },
    [],
  );

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-6 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-3 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'alert' ? 'alert' : 'status'}
            className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-gray-900 shadow-lg ${
              toast.type === 'alert'
                ? 'border-red-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              {toast.type === 'alert' ? (
                <AlertCircle
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-red-600"
                />
              ) : (
                <CheckCircle2
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-primary-600"
                />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-gray-400 transition-colors hover:text-gray-700"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
