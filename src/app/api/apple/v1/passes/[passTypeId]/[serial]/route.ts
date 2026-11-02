// PassKit Web Service · el iPhone descarga la versión más reciente del pase.
import { cardVersion, getCardBundle } from "@/server/repos/cards";
import { buildApplePass, checkAppleAuth } from "@/server/integrations/apple/pass";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ passTypeId: string; serial: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { passTypeId, serial } = await params;
  if (passTypeId !== process.env.APPLE_PASS_TYPE_ID) return new Response(null, { status: 404 });

  const b = await getCardBundle(serial);
  if (!b) return new Response(null, { status: 404 });
  if (!checkAppleAuth(request, b.card.auth_token)) return new Response(null, { status: 401 });

  const version = Math.floor(cardVersion(b) / 1000) * 1000; // las fechas HTTP tienen precisión de segundos
  const since = request.headers.get("if-modified-since");
  if (since && new Date(since).getTime() >= version) return new Response(null, { status: 304 });

  const pkpass = await buildApplePass(b);
  return new Response(new Uint8Array(pkpass), {
    headers: {
      "content-type": "application/vnd.apple.pkpass",
      "last-modified": new Date(version).toUTCString(),
      "cache-control": "no-cache",
    },
  });
}
