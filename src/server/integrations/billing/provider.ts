import type { BillingCycle, PlanId, SubscriptionStatus } from "@/core/plans";

/**
 * Contrato que cumple cualquier pasarela de cobro (Mercado Pago hoy, Stripe
 * después). El resto de la app solo conoce esta interfaz.
 */
export interface CheckoutRequest {
  businessId: string;
  plan: PlanId;
  cycle: BillingCycle;
  amount: number;
  payerEmail: string;
  returnUrl: string;
}

export interface ProviderSubscription {
  providerSubscriptionId: string;
  businessId: string;
  plan: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  providerStatus: string;
  currentPeriodEnd: string | null;
}

export interface WebhookEvent {
  /** Clave única para no procesar dos veces el mismo aviso */
  key: string;
  topic: string;
  resourceId: string;
}

export interface BillingProvider {
  readonly id: "mercadopago" | "stripe";
  createCheckout(req: CheckoutRequest): Promise<{ url: string; providerSubscriptionId: string }>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  cancel(providerSubscriptionId: string): Promise<void>;
  /** Valida la firma y devuelve el evento, o null si no es válido */
  parseWebhook(request: Request, rawBody: string): Promise<WebhookEvent | null>;
  /** Traduce el evento a la suscripción que cambió (o null si no aplica) */
  resolveEvent(event: WebhookEvent): Promise<ProviderSubscription | null>;
}

/** referencia externa = "negocio|plan|ciclo" */
export function encodeReference(businessId: string, plan: PlanId, cycle: BillingCycle) {
  return `${businessId}|${plan}|${cycle}`;
}

export function decodeReference(ref: string | null | undefined): { businessId: string; plan: PlanId; cycle: BillingCycle } | null {
  const [businessId, plan, cycle] = (ref ?? "").split("|");
  if (!businessId || !["esencial", "pro", "cadena"].includes(plan) || !["monthly", "yearly"].includes(cycle)) return null;
  return { businessId, plan: plan as PlanId, cycle: cycle as BillingCycle };
}
