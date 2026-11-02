/**
 * Estudio de mercado de cada negocio. Código puro: recibe lo que calcula
 * Postgres (0007_insights.sql) y lo convierte en segmentos, mapa de horas,
 * retención y, sobre todo, en acciones concretas para vender más.
 */
import { categoryPlural } from "./catalog";

const DAY = 86_400_000;

// ─── Segmentos ────────────────────────────────────────────────────────
export type Lifecycle = "nuevo" | "frecuente" | "ocasional" | "en_riesgo" | "perdido";

export const LIFECYCLE: { id: Lifecycle; label: string; one: string; description: string }[] = [
  { id: "frecuente", label: "Frecuentes", one: "Frecuente", description: "Vinieron este mes y llevan 4 visitas o más" },
  { id: "ocasional", label: "Ocasionales", one: "Ocasional", description: "Vinieron este mes, menos de 4 visitas" },
  { id: "nuevo", label: "Nuevos", one: "Nuevo", description: "Sacaron su tarjeta en los últimos 30 días" },
  { id: "en_riesgo", label: "En riesgo", one: "En riesgo", description: "Su última visita fue hace 1 a 3 meses" },
  { id: "perdido", label: "Perdidos", one: "Perdido", description: "No vienen hace más de 3 meses" },
];

/** Misma regla que insights_segments() en SQL. */
export function lifecycleOf(c: { visits: number; lastVisitAt: string | null; createdAt: string }, now: Date = new Date()): Lifecycle {
  const t = now.getTime();
  const age = (iso: string) => (t - new Date(iso).getTime()) / DAY;
  if (age(c.createdAt) < 30) return "nuevo";
  if (!c.lastVisitAt || age(c.lastVisitAt) >= 90) return "perdido";
  if (age(c.lastVisitAt) >= 30) return "en_riesgo";
  return c.visits >= 4 ? "frecuente" : "ocasional";
}

export interface SegmentCounts {
  total: number;
  nuevo: number;
  frecuente: number;
  ocasional: number;
  en_riesgo: number;
  perdido: number;
  casi: number;
  premio: number;
  una_visita: number;
  con_visita: number;
  regresan: number;
  activos_30d: number;
  dias_entre_visitas: number | null;
  visitas_30d: number;
}

export const EMPTY_SEGMENTS: SegmentCounts = {
  total: 0, nuevo: 0, frecuente: 0, ocasional: 0, en_riesgo: 0, perdido: 0, casi: 0, premio: 0,
  una_visita: 0, con_visita: 0, regresan: 0, activos_30d: 0, dias_entre_visitas: null, visitas_30d: 0,
};

export function normalizeSegments(raw: Partial<Record<keyof SegmentCounts, number | string | null>> | null): SegmentCounts {
  const out = { ...EMPTY_SEGMENTS };
  if (!raw) return out;
  for (const key of Object.keys(EMPTY_SEGMENTS) as (keyof SegmentCounts)[]) {
    const v = raw[key];
    if (key === "dias_entre_visitas") out[key] = v === null || v === undefined ? null : Number(v);
    else out[key] = Number(v ?? 0);
  }
  return out;
}

/** % de clientes que regresan (2+ visitas entre los que vinieron al menos una vez). */
export function returningRate(s: SegmentCounts): number | null {
  return s.con_visita ? Math.round((100 * s.regresan) / s.con_visita) : null;
}

// ─── Listas para campañas por WhatsApp ────────────────────────────────
export type Campaign = "casi" | "premio" | "riesgo" | "una-visita" | "perdidos";

export const CAMPAIGNS: Record<Campaign, { label: string; description: string }> = {
  casi: { label: "A 1 sello", description: "Les falta un sello para su premio" },
  premio: { label: "Premio listo", description: "Ya pueden canjear y no han venido" },
  riesgo: { label: "En riesgo", description: "Su última visita fue hace 1 a 3 meses" },
  "una-visita": { label: "Vinieron una vez", description: "Vinieron una sola vez hace 2 semanas a 3 meses" },
  perdidos: { label: "Perdidos", description: "No vienen hace más de 3 meses" },
};

export function isCampaign(v: unknown): v is Campaign {
  return typeof v === "string" && v in CAMPAIGNS;
}

export interface MessageVars {
  name: string;
  business: string;
  reward: string;
  stamps: number;
  required: number;
  cardUrl: string;
}

/** Mensaje de WhatsApp listo para mandar a un cliente de la lista. */
export function campaignMessage(c: Campaign, v: MessageVars): string {
  const first = v.name.trim().split(/\s+/)[0] ?? v.name;
  switch (c) {
    case "casi":
      return `¡Hola ${first}! Ya merito: te falta 1 sello para ${lower(v.reward)} en ${v.business}. ¡Te esperamos!`;
    case "premio":
      return `¡Hola ${first}! Tu premio ya está listo en ${v.business}: ${lower(v.reward)}. Pasa por él cuando quieras.`;
    case "riesgo":
      return `¡Hola ${first}! Te extrañamos en ${v.business}. En tu próxima visita te damos sello doble. Llevas ${v.stamps} de ${v.required}: ${v.cardUrl}`;
    case "una-visita":
      return `¡Hola ${first}! Gracias por visitar ${v.business}. Llevas ${v.stamps} de ${v.required} sellos para ${lower(v.reward)}. ¡Te esperamos pronto!`;
    case "perdidos":
      return `¡Hola ${first}! Hace mucho no te vemos en ${v.business}. Tu tarjeta sigue guardada con ${v.stamps} sellos: ${v.cardUrl}`;
  }
}

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// ─── Horas pico ───────────────────────────────────────────────────────
export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export interface HeatCell {
  dow: number;
  hour: number;
  visits: number;
}

export interface Heatmap {
  /** grid[dow][i] con i = hora − fromHour */
  grid: number[][];
  fromHour: number;
  toHour: number;
  max: number;
  total: number;
  peak: { dow: number; hour: number; visits: number } | null;
  /** Ventana de 2 horas más floja dentro del horario en que sí hay visitas */
  weakest: { dow: number; hour: number; visits: number } | null;
}

export function buildHeatmap(cells: HeatCell[]): Heatmap {
  const withVisits = cells.filter((c) => c.visits > 0 && c.dow >= 0 && c.dow <= 6 && c.hour >= 0 && c.hour <= 23);
  if (!withVisits.length) return { grid: [], fromHour: 8, toHour: 21, max: 0, total: 0, peak: null, weakest: null };

  const fromHour = Math.min(...withVisits.map((c) => c.hour));
  const toHour = Math.max(...withVisits.map((c) => c.hour));
  const width = toHour - fromHour + 1;
  const grid = DAYS.map(() => Array.from({ length: width }, () => 0));
  for (const c of withVisits) grid[c.dow][c.hour - fromHour] += c.visits;

  let peak: Heatmap["peak"] = null;
  let max = 0;
  let total = 0;
  grid.forEach((row, dow) =>
    row.forEach((v, i) => {
      total += v;
      if (v > max) {
        max = v;
        peak = { dow, hour: fromHour + i, visits: v };
      }
    }),
  );

  // La ventana más floja solo cuenta horas del horario típico (con visitas en
  // al menos 2 días) y días que abren (con visitas en 2 de esas horas o más):
  // una visita suelta un domingo a las 7 am no vuelve "flojo" todo el domingo.
  const openHour = (i: number) => grid.filter((row) => row[i] > 0).length >= 2;
  const openDay = (row: number[]) => row.filter((v, i) => v > 0 && openHour(i)).length >= 2;
  let weakest: Heatmap["weakest"] = null;
  grid.forEach((row, dow) => {
    if (!openDay(row)) return;
    for (let i = 0; i + 1 < width; i++) {
      if (!openHour(i) || !openHour(i + 1)) continue;
      const v = row[i] + row[i + 1];
      if (!weakest || v < weakest.visits) weakest = { dow, hour: fromHour + i, visits: v };
    }
  });

  return { grid, fromHour, toHour, max, total, peak, weakest };
}

export function hourLabel(h: number): string {
  const suffix = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${suffix}`;
}

// ─── Retención por mes de alta ────────────────────────────────────────
export interface CohortRow {
  cohort: string;
  size: number;
  month_offset: number | null;
  active: number;
}

export interface Cohort {
  cohort: string;
  size: number;
  /** % de la cohorte que selló en el mes 0, 1, 2…; null = ese mes aún no llega */
  pct: (number | null)[];
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function monthLabel(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${String(y).slice(2)}`;
}

export function buildCohorts(rows: CohortRow[], now: Date = new Date()): Cohort[] {
  const map = new Map<string, Cohort>();
  const nowIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();
  for (const r of rows) {
    const key = String(r.cohort).slice(0, 10);
    if (!map.has(key)) {
      const [y, m] = key.split("-").map(Number);
      const months = nowIdx - (y * 12 + (m - 1)) + 1;
      map.set(key, { cohort: key, size: r.size, pct: Array.from({ length: Math.max(1, Math.min(months, 6)) }, () => 0) });
    }
    const c = map.get(key)!;
    if (r.month_offset !== null && r.month_offset >= 0 && r.month_offset < c.pct.length && c.size > 0) {
      c.pct[r.month_offset] = Math.round((100 * r.active) / c.size);
    }
  }
  return [...map.values()].sort((a, b) => a.cohort.localeCompare(b.cohort)).map((c) => ({
    ...c,
    pct: Array.from({ length: 6 }, (_, i) => (i < c.pct.length ? c.pct[i] : null)),
  }));
}

// ─── Comparativo con negocios del mismo giro ──────────────────────────
export interface Benchmark {
  businesses: number;
  returning_rate: number | null;
  visits_per_active: number | null;
  days_between_visits: number | null;
  enrollments_30d: number | null;
}

export interface Comparison {
  key: "returning_rate" | "visits_per_active" | "days_between_visits" | "enrollments_30d";
  label: string;
  unit: string;
  own: number | null;
  peer: number | null;
  /** true si un número más alto es mejor */
  higherIsBetter: boolean;
}

export function compareWithPeers(s: SegmentCounts, b: Benchmark | null): Comparison[] {
  const visitsPerActive = s.activos_30d ? Math.round((10 * s.visitas_30d) / s.activos_30d) / 10 : null;
  return [
    { key: "returning_rate", label: "Clientes que regresan", unit: "%", own: returningRate(s), peer: b?.returning_rate ?? null, higherIsBetter: true },
    { key: "visits_per_active", label: "Visitas al mes por cliente activo", unit: "", own: visitsPerActive, peer: b?.visits_per_active ?? null, higherIsBetter: true },
    { key: "days_between_visits", label: "Días entre visitas", unit: " días", own: s.dias_entre_visitas, peer: b?.days_between_visits ?? null, higherIsBetter: false },
    { key: "enrollments_30d", label: "Clientes nuevos en 30 días", unit: "", own: s.nuevo, peer: b?.enrollments_30d ?? null, higherIsBetter: true },
  ];
}

// ─── Recomendaciones ──────────────────────────────────────────────────
export type RecAction =
  | { kind: "campaign"; campaign: Campaign; label: string }
  | { kind: "link"; href: string; label: string }
  | { kind: "share"; text: string; label: string };

export interface Recommendation {
  id: string;
  tone: "opportunity" | "warning" | "good";
  title: string;
  body: string;
  /** Clientes a los que toca; sirve para ordenar por impacto */
  reach: number;
  action?: RecAction;
  /** Solo en el estudio completo (planes Pro y Cadena) */
  full?: boolean;
}

export interface RecInput {
  segments: SegmentCounts;
  heatmap: Heatmap;
  benchmark: Benchmark | null;
  category: string;
  stampsRequired: number;
  businessName: string;
  reward: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Lo que el negocio debería hacer esta semana, lo de más impacto primero. */
export function recommendations(i: RecInput): Recommendation[] {
  const s = i.segments;
  const out: Recommendation[] = [];

  if (s.casi > 0) {
    out.push({
      id: "casi",
      tone: "opportunity",
      title: `${s.casi} ${plural(s.casi, "cliente está", "clientes están")} a 1 sello de su premio`,
      body: "Un mensaje de “¡ya merito!” es el empujón más fácil para que regresen esta semana.",
      reach: s.casi * 3,
      action: { kind: "campaign", campaign: "casi", label: "Mandarles WhatsApp" },
    });
  }

  if (s.premio > 0) {
    out.push({
      id: "premio",
      tone: "opportunity",
      title: `${s.premio} ${plural(s.premio, "cliente tiene", "clientes tienen")} su premio listo sin cobrar`,
      body: "Recuérdaselo por WhatsApp para que venga por él.",
      reach: s.premio * 2,
      action: { kind: "campaign", campaign: "premio", label: "Recordarles su premio" },
    });
  }

  if (s.en_riesgo > 0) {
    out.push({
      id: "riesgo",
      tone: "warning",
      title: `${s.en_riesgo} ${plural(s.en_riesgo, "cliente no viene", "clientes no vienen")} hace más de un mes`,
      body: "Antes de que se pierdan, mándales un “te extrañamos” con sello doble en su próxima visita.",
      reach: s.en_riesgo * 2,
      action: { kind: "campaign", campaign: "riesgo", label: "Mandar “te extrañamos”" },
    });
  }

  const firstVisitShare = s.con_visita ? Math.round((100 * s.una_visita) / s.con_visita) : 0;
  if (s.una_visita >= 5 && firstVisitShare >= 30) {
    out.push({
      id: "una-visita",
      tone: "warning",
      title: `El ${firstVisitShare} % de tus clientes vino una sola vez`,
      body: "Pide al cajero que dé 2 sellos en la primera compra: el premio se siente cerca y es más fácil que regresen.",
      reach: s.una_visita,
      full: true,
      action: { kind: "campaign", campaign: "una-visita", label: "Ver quiénes son" },
    });
  }

  if (s.dias_entre_visitas && s.dias_entre_visitas > 0 && i.stampsRequired > 4) {
    const daysToReward = Math.round(s.dias_entre_visitas * (i.stampsRequired - 1));
    if (daysToReward > 75) {
      const suggested = Math.max(4, Math.min(i.stampsRequired - 1, Math.round(60 / s.dias_entre_visitas) + 1));
      out.push({
        id: "tarjeta-larga",
        tone: "warning",
        title: `Completar tu tarjeta toma unos ${daysToReward} días`,
        body: `Tus clientes vienen cada ${Math.round(s.dias_entre_visitas)} días. Con ${suggested} sellos en lugar de ${i.stampsRequired}, el premio llega en unos ${Math.round(s.dias_entre_visitas * (suggested - 1))} días y no pierden el interés.`,
        reach: Math.round(s.activos_30d / 2),
        full: true,
        action: { kind: "link", href: "/panel/tarjeta", label: "Ajustar mi tarjeta" },
      });
    }
  }

  const h = i.heatmap;
  if (h.total >= 50 && h.weakest) {
    const day = DAYS[h.weakest.dow];
    const span = `${hourLabel(h.weakest.hour)} a ${hourLabel(h.weakest.hour + 2)}`;
    out.push({
      id: "hora-floja",
      tone: "opportunity",
      title: `Los ${day.toLowerCase()} de ${span} son tu horario más flojo`,
      body: "Anuncia sello doble en ese horario en tu estado de WhatsApp y en el mostrador para llenar las horas vacías.",
      reach: Math.max(5, Math.round(s.activos_30d / 4)),
      full: true,
      action: {
        kind: "share",
        text: `¡${day} de sello doble en ${i.businessName}! De ${span}, cada compra vale 2 sellos para ${lower(i.reward)}.`,
        label: "Compartir promoción",
      },
    });
  }

  const own = returningRate(s);
  const peer = i.benchmark?.returning_rate ?? null;
  if (own !== null && peer !== null && s.con_visita >= 20) {
    const gap = Math.round(own - peer);
    const others = categoryPlural(i.category);
    if (gap <= -5) {
      out.push({
        id: "giro-abajo",
        tone: "warning",
        title: `Tus clientes regresan menos que en otras ${others}`,
        body: `${own} % regresa contra ${Math.round(peer)} % en ${others} que usan Ya Merito. Revisa que el cajero ofrezca la tarjeta en cada cobro y que el premio valga la pena.`,
        reach: Math.round(s.con_visita / 3),
        full: true,
        action: { kind: "link", href: "/panel/tarjeta", label: "Revisar mi premio" },
      });
    } else if (gap >= 5) {
      out.push({
        id: "giro-arriba",
        tone: "good",
        title: `Tus clientes regresan más que en otras ${others}`,
        body: `${own} % regresa contra ${Math.round(peer)} % en ${others} que usan Ya Merito. Sigue así.`,
        reach: 0,
        full: true,
      });
    }
  }

  if (s.nuevo < 10 && s.total < 300) {
    out.push({
      id: "pocas-altas",
      tone: "opportunity",
      title: s.nuevo === 0 ? "Nadie sacó tarjeta en los últimos 30 días" : `Solo ${s.nuevo} ${plural(s.nuevo, "cliente nuevo", "clientes nuevos")} en 30 días`,
      body: "Pon el cartel QR junto a la caja y en las mesas, y pide al cajero que lo ofrezca en cada cobro.",
      reach: 10 - s.nuevo,
      action: { kind: "link", href: "/panel/qr", label: "Ver mi cartel QR" },
    });
  }

  return out.sort((a, b) => b.reach - a.reach || a.id.localeCompare(b.id));
}
