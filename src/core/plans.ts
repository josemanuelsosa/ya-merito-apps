/**
 * Planes, precios y reglas de acceso. Es la única fuente de verdad del modelo
 * de negocio dentro del código: la página de precios, el panel y el cobro
 * leen de aquí.
 */

export type PlanId = "esencial" | "pro" | "cadena";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "canceled";

export interface PlanFeatures {
  /** Reportes por día y por cajero */
  reports: boolean;
  /** Descargar movimientos en CSV */
  export: boolean;
  /** Pedir folio de ticket al sellar */
  ticketRef: boolean;
  /** Soporte por WhatsApp con prioridad */
  prioritySupport: boolean;
  /** Estudio de mercado: "basic" = segmentos y 2 recomendaciones; "full" = todo */
  insights: "basic" | "full";
  /** Comparativo entre sucursales en el estudio de mercado */
  locationCompare: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** MXN, IVA incluido */
  monthly: number;
  /** MXN por año (10 meses: 2 de regalo) */
  yearly: number;
  limits: { locations: number; staff: number };
  features: PlanFeatures;
  highlights: string[];
}

export const TRIAL_DAYS = 14;
/** Días que sigue funcionando después de un pago fallido */
export const GRACE_DAYS = 5;

export const PLANS: Record<PlanId, Plan> = {
  esencial: {
    id: "esencial",
    name: "Esencial",
    tagline: "Para un solo local",
    monthly: 299,
    yearly: 2990,
    limits: { locations: 1, staff: 3 },
    features: { reports: false, export: false, ticketRef: false, prioritySupport: false, insights: "basic", locationCompare: false },
    highlights: [
      "Clientes y sellos ilimitados",
      "Apple Wallet y Google Wallet",
      "1 sucursal · 3 usuarios",
      "Estudio de mercado básico",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "El favorito de los negocios que crecen",
    monthly: 599,
    yearly: 5990,
    limits: { locations: 3, staff: 10 },
    features: { reports: true, export: true, ticketRef: true, prioritySupport: false, insights: "full", locationCompare: false },
    highlights: [
      "Todo lo de Esencial",
      "3 sucursales · 10 usuarios",
      "Estudio de mercado completo",
      "Reportes por cajero y exportación a Excel",
    ],
  },
  cadena: {
    id: "cadena",
    name: "Cadena",
    tagline: "Varias sucursales, un solo programa",
    monthly: 1199,
    yearly: 11990,
    limits: { locations: 10, staff: 50 },
    features: { reports: true, export: true, ticketRef: true, prioritySupport: true, insights: "full", locationCompare: true },
    highlights: [
      "Todo lo de Pro",
      "10 sucursales · 50 usuarios",
      "Comparativo entre sucursales",
      "Soporte prioritario por WhatsApp",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["esencial", "pro", "cadena"];

export function isPlanId(value: unknown): value is PlanId {
  return value === "esencial" || value === "pro" || value === "cadena";
}

export function priceFor(plan: PlanId, cycle: BillingCycle): number {
  return cycle === "yearly" ? PLANS[plan].yearly : PLANS[plan].monthly;
}

/** Precio mensual equivalente del plan anual, para comparar. */
export function monthlyEquivalent(plan: PlanId, cycle: BillingCycle): number {
  return cycle === "yearly" ? Math.round(PLANS[plan].yearly / 12) : PLANS[plan].monthly;
}

export interface SubscriptionLike {
  plan: PlanId;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export type AccessPhase = "trial" | "active" | "grace" | "expired";

export interface Access {
  phase: AccessPhase;
  /** Puede sellar, canjear y dar de alta clientes */
  canOperate: boolean;
  /** Días que le quedan a la prueba o a la gracia */
  daysLeft: number | null;
  plan: Plan;
}

const DAY = 86_400_000;

/**
 * ¿El negocio puede operar hoy? Regla:
 *  - Prueba vigente → sí.
 *  - Suscripción activa → sí.
 *  - Pago fallido → sí durante GRACE_DAYS después del fin de periodo.
 *  - Cancelada o pausada → sí hasta el fin del periodo pagado.
 *  - Lo demás → no (los pases de los clientes se siguen viendo, pero no se sella).
 */
export function accessFor(sub: SubscriptionLike | null, now: Date = new Date()): Access {
  const plan = PLANS[sub?.plan ?? "pro"];
  if (!sub) return { phase: "expired", canOperate: false, daysLeft: null, plan };

  const t = now.getTime();
  const daysUntil = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - t) / DAY) : null);

  if (sub.status === "trialing") {
    const left = daysUntil(sub.trial_ends_at);
    if (left !== null && left > 0) return { phase: "trial", canOperate: true, daysLeft: left, plan };
    return { phase: "expired", canOperate: false, daysLeft: 0, plan };
  }

  if (sub.status === "active") return { phase: "active", canOperate: true, daysLeft: daysUntil(sub.current_period_end), plan };

  const periodLeft = daysUntil(sub.current_period_end);
  if (sub.status === "past_due") {
    const graceLeft = periodLeft === null ? null : periodLeft + GRACE_DAYS;
    if (graceLeft !== null && graceLeft > 0) return { phase: "grace", canOperate: true, daysLeft: graceLeft, plan };
    return { phase: "expired", canOperate: false, daysLeft: 0, plan };
  }

  // paused / canceled: vale hasta el fin del periodo pagado
  if (periodLeft !== null && periodLeft > 0) return { phase: "active", canOperate: true, daysLeft: periodLeft, plan };
  return { phase: "expired", canOperate: false, daysLeft: 0, plan };
}

export type LimitKind = "locations" | "staff";

export function withinLimit(plan: Plan, kind: LimitKind, current: number): boolean {
  return current < plan.limits[kind];
}

/** El plan más barato que permite esta cantidad. */
export function planFor(kind: LimitKind, needed: number): PlanId | null {
  return PLAN_ORDER.find((id) => PLANS[id].limits[kind] >= needed) ?? null;
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(amount);
}
