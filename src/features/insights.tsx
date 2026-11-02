// Piezas del estudio de mercado. Todas son componentes de servidor: no
// mandan JavaScript al teléfono del dueño, solo HTML y CSS.
import Link from "next/link";
import { ArrowRight, Lightbulb, MessageCircle, Share2, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import {
  DAYS,
  DAYS_SHORT,
  hourLabel,
  LIFECYCLE,
  monthLabel,
  returningRate,
  type Cohort,
  type Comparison,
  type Heatmap,
  type Lifecycle,
  type Recommendation,
  type SegmentCounts,
} from "@/core/insights";
import type { LocationRow } from "@/server/services/insights";
import { buttonClass, ButtonLink } from "@/ui/button";

// ─── Recomendaciones ──────────────────────────────────────────────────
const TONES = {
  opportunity: { icon: Lightbulb, wrap: "bg-cempa-wash text-cempa-ink", label: "Oportunidad" },
  warning: { icon: TriangleAlert, wrap: "bg-chile-wash text-[#a92a21]", label: "Atención" },
  good: { icon: TrendingUp, wrap: "bg-agave-wash text-agave", label: "Va bien" },
} as const;

export function RecommendationCard({ rec, compact = false }: { rec: Recommendation; compact?: boolean }) {
  const tone = TONES[rec.tone];
  const Icon = tone.icon;
  return (
    <article className={`flex gap-4 rounded-[22px] border border-line bg-paper ${compact ? "p-4" : "p-5"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.wrap}`} aria-hidden="true">
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="sr-only">{tone.label}:</p>
        <h3 className="font-display text-[17px] leading-snug font-bold">{rec.title}</h3>
        <p className="mt-1 text-[15px] text-ink-2">{rec.body}</p>
        {rec.action ? <div className="mt-3">{actionButton(rec)}</div> : null}
      </div>
    </article>
  );
}

function actionButton(rec: Recommendation) {
  const a = rec.action!;
  if (a.kind === "campaign") {
    return (
      <ButtonLink href={`/panel/clientes?filtro=${a.campaign}`} variant="primary" size="sm">
        <MessageCircle size={16} aria-hidden="true" />
        {a.label}
      </ButtonLink>
    );
  }
  if (a.kind === "share") {
    return (
      <a href={`https://wa.me/?text=${encodeURIComponent(a.text)}`} target="_blank" rel="noopener" className={buttonClass("accent", "sm")}>
        <Share2 size={16} aria-hidden="true" />
        {a.label}
      </a>
    );
  }
  return (
    <ButtonLink href={a.href} variant="ghost" size="sm">
      {a.label}
      <ArrowRight size={16} aria-hidden="true" />
    </ButtonLink>
  );
}

// ─── Segmentos ────────────────────────────────────────────────────────
const SEGMENT_COLOR: Record<Lifecycle, string> = {
  frecuente: "#0e8a5f",
  ocasional: "#7ccfaa",
  nuevo: "#ff7a12",
  en_riesgo: "#f6c35b",
  perdido: "#d4d1de",
};
const SEGMENT_LIST: Partial<Record<Lifecycle, string>> = { nuevo: "nuevos", en_riesgo: "riesgo", perdido: "perdidos" };

export function SegmentBar({ s }: { s: SegmentCounts }) {
  const total = Math.max(1, s.total);
  const parts = LIFECYCLE.map((l) => ({ ...l, value: s[l.id], pct: Math.round((100 * s[l.id]) / total) }));
  return (
    <div>
      <div
        className="flex h-5 w-full gap-[3px] overflow-hidden rounded-full bg-mist"
        role="img"
        aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}
      >
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.id} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(100 * p.value) / total}%`, background: SEGMENT_COLOR[p.id], minWidth: 6 }} />
          ))}
      </div>
      <ul className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
        {parts.map((p) => {
          const list = SEGMENT_LIST[p.id];
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEGMENT_COLOR[p.id] }} aria-hidden="true" />
                {p.label}
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="tabular font-display text-[28px] leading-none font-bold">{p.value}</span>
                <span className="tabular text-sm text-ink-3">{p.pct}%</span>
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-2">{p.description}</span>
            </>
          );
          return (
            <li key={p.id}>
              {list && p.value > 0 ? (
                <Link href={`/panel/clientes?filtro=${list}`} className="-m-2 block rounded-xl p-2 hover:bg-mist">
                  {body}
                </Link>
              ) : (
                <div>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function KeyNumbers({ s }: { s: SegmentCounts }) {
  const rate = returningRate(s);
  const items = [
    { label: "Regresan", value: rate === null ? "—" : `${rate}%`, note: "de quienes vinieron, volvieron" },
    { label: "Cada cuánto vienen", value: s.dias_entre_visitas ? `${Math.round(s.dias_entre_visitas)} días` : "—", note: "entre una visita y otra" },
    { label: "Activos este mes", value: s.activos_30d, note: `${s.visitas_30d} visitas en 30 días` },
    { label: "Esperan su premio", value: s.premio + s.casi, note: `${s.premio} listos, ${s.casi} a 1 sello` },
  ];
  return (
    <dl className="grid grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-line">
      {items.map((i) => (
        <div key={i.label} className="md:px-6 md:first:pl-0">
          <dt className="text-sm text-ink-2">{i.label}</dt>
          <dd className="tabular mt-1 font-display text-[34px] leading-none font-bold tracking-[-0.02em]">{i.value}</dd>
          <dd className="mt-1.5 text-[13px] text-ink-3">{i.note}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Mapa de horas ────────────────────────────────────────────────────
export function HeatmapView({ h }: { h: Heatmap }) {
  if (!h.peak) {
    return <p className="text-ink-2">Aparece en cuanto tengas visitas selladas. Con 2 o 3 semanas de uso ya se notan tus horas fuertes.</p>;
  }
  const hours = Array.from({ length: h.toHour - h.fromHour + 1 }, (_, i) => h.fromHour + i);
  const shade = (v: number) => {
    if (!v) return { background: "var(--color-mist)" };
    const a = 0.14 + 0.86 * (v / h.max);
    return { background: `rgb(255 122 18 / ${a.toFixed(2)})` };
  };
  const isWeak = (dow: number, hour: number) => h.weakest && h.weakest.dow === dow && (hour === h.weakest.hour || hour === h.weakest.hour + 1);

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <table className="w-full min-w-[520px] border-separate border-spacing-[3px]" aria-label="Visitas por día y hora, últimos 90 días">
          <thead>
            <tr>
              <th scope="col" className="w-10">
                <span className="sr-only">Día</span>
              </th>
              {hours.map((hr, i) => (
                <th key={hr} scope="col" className="tabular h-5 text-[11px] font-medium text-ink-3">
                  {i % 2 === 0 ? hourLabel(hr).replace(" ", "") : <span className="sr-only">{hourLabel(hr)}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {h.grid.map((row, dow) => (
              <tr key={dow}>
                <th scope="row" className="pr-1 text-left text-xs font-semibold text-ink-2">
                  <abbr title={DAYS[dow]} className="no-underline">
                    {DAYS_SHORT[dow]}
                  </abbr>
                </th>
                {row.map((v, i) => (
                  <td
                    key={i}
                    title={`${DAYS[dow]}, ${hourLabel(h.fromHour + i)}: ${v} ${v === 1 ? "visita" : "visitas"}`}
                    className={`h-8 rounded-md ${isWeak(dow, h.fromHour + i) ? "outline-2 -outline-offset-2 outline-ink outline-dashed" : ""}`}
                    style={shade(v)}
                  >
                    <span className="sr-only">{v}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-cempa" aria-hidden="true" />
          Tu hora fuerte: <strong>{DAYS[h.peak.dow].toLowerCase()} a las {hourLabel(h.peak.hour)}</strong>
        </span>
        {h.weakest ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded outline-2 -outline-offset-2 outline-ink outline-dashed" aria-hidden="true" />
            Más floja: <strong>{DAYS[h.weakest.dow].toLowerCase()} de {hourLabel(h.weakest.hour)} a {hourLabel(h.weakest.hour + 2)}</strong>
          </span>
        ) : null}
        <span className="flex items-center gap-1.5 text-ink-3">
          Menos
          <span className="flex gap-[2px]" aria-hidden="true">
            {[0.14, 0.4, 0.7, 1].map((a) => (
              <span key={a} className="h-3 w-4 rounded-sm" style={{ background: `rgb(255 122 18 / ${a})` }} />
            ))}
          </span>
          Más
        </span>
      </div>
    </div>
  );
}

// ─── Retención por mes de alta ────────────────────────────────────────
export function CohortTable({ cohorts }: { cohorts: Cohort[] }) {
  if (!cohorts.length) {
    return <p className="text-ink-2">Aparece cuando tus clientes cumplan su primer mes con la tarjeta.</p>;
  }
  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <table className="w-full min-w-[560px] border-separate border-spacing-[3px] text-sm">
          <thead>
            <tr className="text-ink-2">
              <th scope="col" className="pb-1 text-left font-semibold">Se dieron de alta</th>
              <th scope="col" className="tabular pb-1 text-right font-semibold">Clientes</th>
              {["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"].map((m) => (
                <th key={m} scope="col" className="pb-1 text-center font-semibold">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohort}>
                <th scope="row" className="py-1 pr-2 text-left font-medium capitalize">
                  {monthLabel(c.cohort)}
                </th>
                <td className="tabular pr-2 text-right text-ink-2">{c.size}</td>
                {c.pct.map((p, i) => (
                  <td
                    key={i}
                    className={`tabular h-9 rounded-md text-center font-semibold ${p === null ? "" : p >= 55 ? "text-white" : "text-ink"}`}
                    style={p === null ? undefined : { background: p ? `rgb(14 138 95 / ${(0.1 + 0.9 * (p / 100)).toFixed(2)})` : "var(--color-mist)" }}
                  >
                    {p === null ? <span className="sr-only">aún no</span> : `${p}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Cada fila es un grupo de clientes según el mes en que sacaron su tarjeta. Las casillas dicen qué parte de ese grupo vino a sellar en cada mes. Si
        el número baja rápido después del mes 1, el premio está lejos o no se les recuerda que tienen tarjeta.
      </p>
    </div>
  );
}

// ─── Comparativo con el giro ──────────────────────────────────────────
export function PeerComparison({ rows, peers, plural, businesses }: { rows: Comparison[]; peers: boolean; plural: string; businesses: number }) {
  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((r) => {
          const verdict = verdictOf(r);
          return (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
              <div className="min-w-0">
                <p className="font-semibold">{r.label}</p>
                <p className="text-sm text-ink-2">
                  {r.peer === null ? "Sin dato del giro todavía" : `${fmt(r.peer)}${r.unit} en ${plural} que usan Ya Merito`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular font-display text-[26px] leading-none font-bold">{r.own === null ? "—" : `${fmt(r.own)}${r.unit}`}</span>
                {verdict ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      verdict === "arriba" ? "bg-agave-wash text-[#0a6646]" : verdict === "abajo" ? "bg-chile-wash text-[#a92a21]" : "bg-mist text-ink-2"
                    }`}
                  >
                    {verdict === "arriba" ? <TrendingUp size={13} aria-hidden="true" /> : verdict === "abajo" ? <TrendingDown size={13} aria-hidden="true" /> : null}
                    {verdict === "arriba" ? "Mejor" : verdict === "abajo" ? "Peor" : "Parejo"}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-ink-2">
        {peers
          ? `Mediana de ${businesses} ${plural} con Ya Merito. Nunca mostramos datos de un negocio en particular.`
          : `Todavía no hay suficientes ${plural} en Ya Merito para comparar (necesitamos al menos 5). Aparece solo en cuanto las haya; mientras, aquí ves tus propios números.`}
      </p>
    </div>
  );
}

function verdictOf(r: Comparison): "arriba" | "abajo" | "parejo" | null {
  if (r.own === null || r.peer === null || r.peer === 0) return null;
  const diff = (r.own - r.peer) / r.peer;
  if (Math.abs(diff) < 0.08) return "parejo";
  const better = r.higherIsBetter ? diff > 0 : diff < 0;
  return better ? "arriba" : "abajo";
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// ─── Sucursales (plan Cadena) ─────────────────────────────────────────
export function LocationsTable({ rows }: { rows: LocationRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.visits));
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[520px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line text-sm text-ink-2">
            <th scope="col" className="py-2 font-semibold">Sucursal</th>
            <th scope="col" className="py-2 font-semibold">Visitas, 30 días</th>
            <th scope="col" className="tabular py-2 text-right font-semibold">Altas</th>
            <th scope="col" className="tabular py-2 text-right font-semibold">Canjes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.location_id} className="border-b border-line">
              <th scope="row" className="py-3 pr-4 font-medium">{r.name}</th>
              <td className="py-3 pr-4">
                <span className="flex items-center gap-3">
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${(100 * r.visits) / max}%` }} />
                  </span>
                  <span className="tabular w-10 text-right">{r.visits}</span>
                </span>
              </td>
              <td className="tabular py-3 text-right">{r.enrollments}</td>
              <td className="tabular py-3 text-right">{r.redemptions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
