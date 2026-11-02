// Imagen de sellos COMPARTIDA: todos los clientes con 3 sellos ven la misma.
// Con ?v=<versión del diseño> se cachea un año en la CDN (la URL cambia si cambia el diseño).
import { db } from "@/server/db";
import { renderStrip } from "@/server/integrations/images";
import type { Program } from "@/server/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ programId: string; stamps: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { programId, stamps } = await params;
  const n = Number.parseInt(stamps, 10);
  if (!/^[0-9a-f-]{36}$/i.test(programId) || !Number.isInteger(n) || n < 0 || n > 20) return new Response(null, { status: 404 });

  const { data: program } = await db().from("programs").select("*").eq("id", programId).maybeSingle<Program>();
  if (!program || n > program.stamps_required) return new Response(null, { status: 404 });

  // 1032×336 es la proporción que recomienda Google para heroImage
  const png = await renderStrip(program, n, 1032, 336);
  const versioned = new URL(request.url).searchParams.has("v");
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=60",
    },
  });
}
