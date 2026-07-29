"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { AlertCircle, Check, Close } from "@/components/ui/Icons";
import { cn } from "@/lib/format";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, options?: { tone?: ToastTone; action?: Toast["action"] }) => void;
  success: (message: string, action?: Toast["action"]) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_AFTER_MS = 4200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (message, options) => {
      const id = nextId.current++;
      setToasts((current) => [
        ...current.slice(-2),
        { id, message, tone: options?.tone ?? "info", action: options?.action },
      ]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, action) => toast(message, { tone: "success", action }),
      error: (message) => toast(message, { tone: "error" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              aria-live="polite"
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-full py-2.5 pr-2.5 pl-4",
                "shadow-[0_10px_34px_-8px_rgba(24,22,30,0.4)]",
                item.tone === "error" ? "bg-danger text-white" : "bg-plum text-white",
              )}
            >
              <span className="shrink-0 opacity-90">
                {item.tone === "error" ? <AlertCircle size={17} /> : <Check size={17} />}
              </span>
              <span className="text-[13.5px] font-medium whitespace-nowrap">{item.message}</span>

              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                  className="rounded-full px-2.5 py-1 text-[13px] font-semibold underline decoration-white/40 underline-offset-2 hover:decoration-white"
                >
                  {item.action.label}
                </button>
              )}

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss"
                className="rounded-full p-1 opacity-65 transition-opacity hover:opacity-100"
              >
                <Close size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
