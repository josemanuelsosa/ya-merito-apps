// QR de alta en PNG (para imprimir en otro diseño, redes o lona).
import QRCode from "qrcode";
import { requireStaff } from "@/server/auth/session";
import { appUrl } from "@/server/env";
import { errorResponse } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireStaff("stamp");
    const s = new URL(request.url).searchParams.get("s");
    const location = ctx.locations.find((l) => l.id === s);
    const url = `${appUrl()}/u/${ctx.business.slug}${location ? `?s=${location.id}` : ""}`;
    const png = await QRCode.toBuffer(url, { type: "png", width: 1200, margin: 2, errorCorrectionLevel: "M", color: { dark: "#17152B", light: "#FFFFFF" } });
    return new Response(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `attachment; filename="qr-${ctx.business.slug}${location ? `-${location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.png"`,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
