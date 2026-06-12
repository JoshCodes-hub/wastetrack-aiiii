"use client";

import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

let addToastFn: ((t: Toast) => void) | null = null;

export function showToast(toast: Omit<Toast, "id">) {
  addToastFn?.({ ...toast, id: Date.now().toString() });
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  const colors: Record<string, string> = {
    info: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/30",
    success: "border-l-green-500 bg-green-50 dark:bg-green-900/30",
    warning: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/30",
    error: "border-l-red-500 bg-red-50 dark:bg-red-900/30",
  };
  const icons: Record<string, string> = {
    info: "ℹ️", success: "✅", warning: "⚠️", error: "❌",
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-xl border-l-4 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right ${colors[t.type]}`}
        >
          <div className="flex items-start gap-2">
            <span>{icons[t.type]}</span>
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{t.title}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{t.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
