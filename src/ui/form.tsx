"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { buttonClass } from "@/ui/button";

const control =
  "w-full rounded-xl border-[1.5px] border-line bg-paper px-3.5 text-[16px] text-ink placeholder:text-ink-3 outline-none transition-[border-color,box-shadow] focus:border-ink focus:shadow-[0_0_0_4px_rgb(255_122_18/0.18)] aria-[invalid=true]:border-chile";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-chile">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={`${control} h-12 ${className}`}
    />
  );
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={`${control} h-12 appearance-none pr-10 ${className}`}>
        {children}
      </select>
      <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-2" />
    </span>
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} min-h-24 py-3 leading-relaxed ${className}`} />;
}

/** Botón de envío que se desactiva mientras la acción corre. */
export function SubmitButton({
  children,
  pending: pendingLabel,
  variant = "primary",
  size = "lg",
  className = "",
}: {
  children: ReactNode;
  pending?: string;
  variant?: "primary" | "accent";
  size?: "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, `w-full ${className}`)}>
      {pending ? (pendingLabel ?? "Un momento…") : children}
    </button>
  );
}

/** Aviso dentro de la página (no flotante). */
export function Notice({ tone = "info", children }: { tone?: "info" | "ok" | "error" | "warn"; children: ReactNode }) {
  const tones = {
    info: "bg-mist text-ink",
    ok: "bg-agave-wash text-[#0a6646]",
    error: "bg-chile-wash text-[#a92a21]",
    warn: "bg-cempa-wash text-[#8a3a05]",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[15px] leading-snug ${tones[tone]}`}>
      {children}
    </div>
  );
}
