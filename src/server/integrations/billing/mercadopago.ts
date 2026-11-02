import "server-only";
import type { SubscriptionStatus } from "@/core/plans";
import { requireEnv } from "@/server/env";
import { verifyMercadoPagoSignature } from "@/server/integrations/billing/signature";
import {
  decodeReference,
  encodeReference,
  type BillingProvider,
  type ProviderSubscription,
  type WebhookEvent,
} from "@/server/integrations/billing/provider";

/**
 * Mercado Pago · Suscripciones sin plan asociado (API /preapproval).
 * El cliente autoriza el cobro recurrente en la página de Mercado Pago
 * (init_point) y Mercado Pago avisa los cambios por webhook.
 */
const API = "https://api.mercadopago.com";

async function mp<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${requireEnv("MP_ACCESS_TOKEN")}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Mercado Pago ${method} ${path} ${res.status}: ${data.message ?? ""}`);
  return data;
}

interface Preapproval {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference?: string;
  init_point?: string;
  next_payment_date?: string;
}

interface AuthorizedPayment {
  id: number;
  preapproval_id: string;
  status: string;
  payment?: { status?: string };
}

function mapStatus(status: Preapproval["status"]): SubscriptionStatus {
  switch (status) {
    case "authorized":
      return "active";
    case "paused":
      return "paused";
    case "cancelled":
      return "canceled";
    default:
      return "trialing"; // pending: el dueño aún no autoriza; no cambiamos su acceso
  }
}

function toSubscription(p: Preapproval): ProviderSubscription {
  const ref = decodeReference(p.external_reference);
  if (!ref) throw new Error(`Suscripción ${p.id} sin referencia válida`);
  return {
    providerSubscriptionId: p.id,
    businessId: ref.businessId,
    plan: ref.plan,
    cycle: ref.cycle,
    status: mapStatus(p.status),
    providerStatus: p.status,
    currentPeriodEnd: p.next_payment_date ?? null,
  };
}

export const mercadoPago: BillingProvider = {
  id: "mercadopago",

  async createCheckout(req) {
    const p = await mp<Preapproval>("POST", "/preapproval", {
      reason: `Ya Merito · Plan ${req.plan === "esencial" ? "Esencial" : req.plan === "pro" ? "Pro" : "Cadena"}${req.cycle === "yearly" ? " anual" : ""}`,
      external_reference: encodeReference(req.businessId, req.plan, req.cycle),
      payer_email: req.payerEmail,
      back_url: req.returnUrl,
      status: "pending",
      auto_recurring: {
        frequency: req.cycle === "yearly" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: req.amount,
        currency_id: "MXN",
      },
    });
    if (!p.init_point) throw new Error("Mercado Pago no devolvió el enlace de pago");
    return { url: p.init_point, providerSubscriptionId: p.id };
  },

  async getSubscription(id) {
    return toSubscription(await mp<Preapproval>("GET", `/preapproval/${encodeURIComponent(id)}`));
  },

  async cancel(id) {
    await mp("PUT", `/preapproval/${encodeURIComponent(id)}`, { status: "cancelled" });
  },

  async parseWebhook(request, rawBody) {
    const url = new URL(request.url);
    let body: { type?: string; topic?: string; data?: { id?: string } } = {};
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      /* algunos avisos llegan sin cuerpo */
    }
    const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? null;
    const topic = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? body.topic ?? "";
    const ok = verifyMercadoPagoSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: requireEnv("MP_WEBHOOK_SECRET"),
      toleranceSeconds: 600,
    });
    if (!ok || !dataId) return null;
    const requestId = request.headers.get("x-request-id") ?? `${topic}:${dataId}:${Date.now()}`;
    return { key: requestId, topic, resourceId: dataId };
  },

  async resolveEvent(event) {
    if (event.topic === "subscription_preapproval") {
      return this.getSubscription(event.resourceId);
    }
    if (event.topic === "subscription_authorized_payment") {
      const payment = await mp<AuthorizedPayment>("GET", `/authorized_payments/${encodeURIComponent(event.resourceId)}`);
      const sub = await this.getSubscription(payment.preapproval_id);
      // Cobro rechazado de una suscripción vigente → pago pendiente (entra el periodo de gracia)
      if (sub.status === "active" && payment.payment?.status === "rejected") return { ...sub, status: "past_due" };
      return sub;
    }
    return null;
  },
};
