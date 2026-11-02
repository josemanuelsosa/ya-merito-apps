// "Agregar a Apple Wallet": descarga del .pkpass firmado.
import { features } from "@/server/env";
import { getCardBundle } from "@/server/repos/cards";
import { buildApplePass } from "@/server/integrations/apple/pass";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  if (!features.apple) return new Response("Apple Wallet aún no está configurado.", { status: 503 });

  const b = await getCardBundle(serial);
  if (!b) return new Response("Tarjeta no encontrada", { status: 404 });

  try {
    const pkpass = await buildApplePass(b);
    return new Response(new Uint8Array(pkpass), {
      headers: {
        "content-type": "application/vnd.apple.pkpass",
        "content-disposition": `attachment; filename="${b.business.slug}.pkpass"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error("[apple] no se pudo generar el pase", e);
    return new Response("No se pudo generar el pase. Intenta de nuevo.", { status: 500 });
  }
}
