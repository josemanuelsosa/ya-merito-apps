import { createHmac, timingSafeEqual } from "node:crypto";

/** Firma x-signature: HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (se omiten las partes vacías). */
export function verifyMercadoPagoSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  toleranceSeconds?: number;
  now?: number;
}): boolean {
  if (!opts.xSignature) return false;
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of opts.xSignature.split(",")) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!ts || !v1 || !/^\d+$/.test(ts)) return false;

  const parts: string[] = [];
  if (opts.dataId) parts.push(`id:${opts.dataId}`);
  if (opts.xRequestId) parts.push(`request-id:${opts.xRequestId}`);
  parts.push(`ts:${ts}`);
  const expected = createHmac("sha256", opts.secret).update(parts.join(";") + ";").digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  if (opts.toleranceSeconds !== undefined) {
    const drift = Math.abs((opts.now ?? Date.now()) - Number(ts) * 1000) / 1000;
    if (drift > opts.toleranceSeconds) return false;
  }
  return true;
}
