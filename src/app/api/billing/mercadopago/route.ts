// Webhook de Mercado Pago (Suscripciones). Configúralo en Tus integraciones →
// Webhooks con los eventos "Planes y suscripciones".
import { handleWebhook } from "@/server/services/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const status = await handleWebhook(request);
    return new Response(null, { status });
  } catch (e) {
    console.error("[cobro] webhook", e);
    return new Response(null, { status: 500 });
  }
}
