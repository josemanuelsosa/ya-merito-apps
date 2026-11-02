import "server-only";
import { AppError } from "@/core/errors";
import { priceFor } from "@/core/plans";
import { checkoutSchema } from "@/core/schemas";
import { parse } from "@/server/action";
import { can, type StaffContext } from "@/server/auth/session";
import { db } from "@/server/db";
import { appUrl, features } from "@/server/env";
import { mercadoPago } from "@/server/integrations/billing/mercadopago";
import type { BillingProvider, ProviderSubscription } from "@/server/integrations/billing/provider";

/** La pasarela activa. Para usar Stripe, implementa BillingProvider y cámbiala aquí. */
function provider(): BillingProvider {
  if (!features.mercadopago) throw new AppError("billing_unavailable");
  return mercadoPago;
}

/** Inicia el pago: devuelve la URL de Mercado Pago donde el dueño autoriza el cobro. */
export async function startCheckout(ctx: StaffContext, input: unknown): Promise<string> {
  if (!can(ctx, "billing")) throw new AppError("forbidden");
  const data = parse(checkoutSchema, input);
  if (!ctx.user.email) throw new AppError("invalid_input", "Tu cuenta necesita un correo para cobrar.");

  const { url } = await provider().createCheckout({
    businessId: ctx.business.id,
    plan: data.plan,
    cycle: data.cycle,
    amount: priceFor(data.plan, data.cycle),
    payerEmail: ctx.user.email,
    returnUrl: `${appUrl()}/panel/plan?pago=procesando`,
  });
  return url;
}

export async function cancelSubscription(ctx: StaffContext) {
  if (!can(ctx, "billing")) throw new AppError("forbidden");
  const sub = ctx.subscription;
  if (!sub?.provider_subscription_id) throw new AppError("not_found", "No hay una suscripción de pago activa.");
  await provider().cancel(sub.provider_subscription_id);
  await db().from("subscriptions").update({ status: "canceled", provider_status: "cancelled" }).eq("business_id", ctx.business.id);
}

/** Guarda en la base lo que dice la pasarela. "pending" no cambia el acceso. */
async function apply(sub: ProviderSubscription) {
  const patch: Record<string, unknown> = {
    plan: sub.plan,
    billing_cycle: sub.cycle,
    provider: "mercadopago",
    provider_subscription_id: sub.providerSubscriptionId,
    provider_status: sub.providerStatus,
    current_period_end: sub.currentPeriodEnd,
  };
  if (sub.providerStatus !== "pending") patch.status = sub.status;
  const { error } = await db().from("subscriptions").update(patch).eq("business_id", sub.businessId);
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`);
}

/** Al volver de Mercado Pago (?preapproval_id=…) sincronizamos sin esperar el webhook. */
export async function syncFromReturn(ctx: StaffContext, providerSubscriptionId: string) {
  if (!can(ctx, "billing") || !features.mercadopago) return;
  try {
    const sub = await provider().getSubscription(providerSubscriptionId);
    if (sub.businessId === ctx.business.id) await apply(sub);
  } catch (e) {
    console.warn("[cobro] sincronización al volver", e);
  }
}

/**
 * Webhook: valida la firma, guarda el aviso una sola vez (idempotente)
 * y actualiza la suscripción. Devuelve el código HTTP para la pasarela.
 */
export async function handleWebhook(request: Request): Promise<number> {
  const p = provider();
  const raw = await request.text();
  const event = await p.parseWebhook(request, raw);
  if (!event) return 401;

  const { error: dup } = await db()
    .from("billing_events")
    .insert({ provider: p.id, event_key: event.key, topic: event.topic, payload: safeJson(raw) });
  if (dup) return 200; // ya procesado (clave repetida)

  try {
    const sub = await p.resolveEvent(event);
    if (sub) await apply(sub);
    await db().from("billing_events").update({ processed_at: new Date().toISOString() }).eq("provider", p.id).eq("event_key", event.key);
    return 200;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Se borra el registro para que el reintento de la pasarela vuelva a procesarlo
    await db().from("billing_events").delete().eq("provider", p.id).eq("event_key", event.key);
    console.error("[cobro] webhook", message);
    return 500;
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return { raw: raw.slice(0, 2000) };
  }
}
