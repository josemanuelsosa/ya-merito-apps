// "Agregar a Google Wallet": asegura clase y objeto, y redirige al enlace de guardado.
import { features } from "@/server/env";
import { getCardBundle } from "@/server/repos/cards";
import { ensureGoogleObject, googleSaveUrl } from "@/server/integrations/google/wallet";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  if (!features.google) return new Response("Google Wallet aún no está configurado.", { status: 503 });

  const b = await getCardBundle(serial);
  if (!b) return new Response("Tarjeta no encontrada", { status: 404 });

  try {
    await ensureGoogleObject(b);
    return Response.redirect(googleSaveUrl(b.card.serial_number), 302);
  } catch (e) {
    console.error("[google] no se pudo crear el pase", e);
    return new Response("No se pudo crear el pase de Google Wallet. Intenta de nuevo.", { status: 502 });
  }
}
