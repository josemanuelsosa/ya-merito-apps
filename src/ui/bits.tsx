import type { ReactNode } from "react";
import { initials } from "@/core/text";

/** Encabezado de página del panel: título grande, una línea de contexto y acciones. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[-0.02em] sm:text-[38px]">{title}</h1>
        {description ? <p className="mt-2 max-w-[60ch] text-[15px] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Sección con título pequeño y línea divisoria (en lugar de tarjetas). */
export function Section({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-t border-line pt-5 ${className}`}>
      {title || aside ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-display text-xl font-bold tracking-[-0.01em]">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Avatar({ name, size = 40, tone = "mist" }: { name: string; size?: number; tone?: "mist" | "cempa" | "agave" }) {
  const tones = { mist: "bg-mist text-ink-2", cempa: "bg-cempa-wash text-cempa-ink", agave: "bg-agave-wash text-agave" };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function Pill({ tone = "mist", children }: { tone?: "mist" | "cempa" | "agave" | "chile" | "ink"; children: ReactNode }) {
  const tones = {
    mist: "bg-mist text-ink-2",
    cempa: "bg-cempa-wash text-cempa-ink",
    agave: "bg-agave-wash text-[#0a6646]",
    chile: "bg-chile-wash text-[#a92a21]",
    ink: "bg-ink text-paper",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** Fila de puntos de progreso (sellos). */
export function StampDots({ stamps, required, size = 14 }: { stamps: number; required: number; size?: number }) {
  return (
    <span className="inline-flex flex-wrap gap-1" role="img" aria-label={`${stamps} de ${required} sellos`}>
      {Array.from({ length: required }, (_, i) => (
        <span
          key={i}
          className={`rounded-full ${i < stamps ? (stamps >= required ? "bg-agave" : "bg-cempa") : "bg-mist-2"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

/** Estado vacío: dice qué va a aparecer y cómo empezar. */
export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-mist px-6 py-8">
      {icon ? <span className="text-ink-2">{icon}</span> : null}
      <div>
        <p className="font-display text-lg font-bold">{title}</p>
        {children ? <div className="mt-1 max-w-[52ch] text-[15px] text-ink-2">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

/** Gráfica de barras pequeña, dibujada a escala. */
export function Bars({
  points,
  height = 120,
  label,
  highlightLast = true,
}: {
  points: { label: string; value: number }[];
  height?: number;
  label: string;
  highlightLast?: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  return (
    <figure className="w-full">
      <div className="relative flex gap-2" style={{ height }}>
        <div className="tabular relative w-6 shrink-0 text-right text-[11px] text-ink-3">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-[3px] border-b border-line">
          {ticks.slice(1).map((t) => (
            <span key={t} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          {points.map((p, i) => (
            <div key={p.label} className="group relative flex h-full flex-1 items-end">
              <div
                className={`w-full rounded-t-[4px] ${highlightLast && i === points.length - 1 ? "bg-cempa" : "bg-ink/80"}`}
                style={{ height: `${(p.value / top) * 100}%`, minHeight: p.value ? 3 : 0 }}
              />
              <span className="tabular pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[11px] whitespace-nowrap text-paper opacity-0 transition-opacity group-hover:opacity-100">
                {p.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 ml-8 flex justify-between text-[11px] text-ink-3">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 5 / 10) * 10;
  const ticks = [0];
  while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}
