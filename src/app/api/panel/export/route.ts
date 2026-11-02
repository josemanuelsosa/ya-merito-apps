// Descarga de movimientos en CSV (planes Pro y Cadena).
import { requireStaff } from "@/server/auth/session";
import { errorResponse } from "@/server/http";
import { exportEventsCsv, localDay } from "@/server/services/reports";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireStaff("reports");
    const days = Number(new URL(request.url).searchParams.get("dias") ?? 30) || 30;
    const csv = await exportEventsCsv(ctx, days);
    const name = `ya-merito-${ctx.business.slug}-${localDay(ctx.business.timezone)}.csv`;
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
