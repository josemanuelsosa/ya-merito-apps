import "server-only";
import { NextResponse } from "next/server";
import { toAppError } from "@/core/errors";

/** IP del cliente (detrás del proxy de Vercel). */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

/** Convierte cualquier error en una respuesta JSON legible. */
export function errorResponse(error: unknown) {
  const e = toAppError(error);
  if (e.code === "unknown") console.error("[api]", error);
  return json({ error: e.message, code: e.code, fields: e.fields }, e.status);
}
