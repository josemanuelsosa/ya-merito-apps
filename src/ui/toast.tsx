"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, Info } from "lucide-react";

type Tone = "ok" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

/** Avisos flotantes cortos ("Guardado", "Enlace copiado"). */
export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = useCallback((text: string, tone: Tone = "ok") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const icons = { ok: CircleCheck, error: TriangleAlert, info: Info };
  const colors = { ok: "text-[#5fe0b0]", error: "text-[#ff9a90]", info: "text-paper/70" };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
      >
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex max-w-sm animate-rise items-center gap-2.5 rounded-full bg-ink py-2.5 pr-5 pl-3.5 text-[15px] text-paper shadow-[var(--shadow-float)]"
            >
              <Icon size={18} className={colors[t.tone]} aria-hidden="true" />
              {t.text}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
