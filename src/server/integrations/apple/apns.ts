import "server-only";
import http2 from "node:http2";
import { db } from "@/server/db";
import { requireEnv } from "@/server/env";
import { appleCertificates } from "@/server/integrations/apple/pass";

export interface PushResult {
  sent: number;
  failed: number;
  devices: number;
}

const CHUNK = 500;

/**
 * Avisa a los iPhones que tienen estos pases que hay versión nueva.
 * Wallet usa el certificado del Pass Type ID como certificado TLS de cliente y
 * un cuerpo vacío; el iPhone luego pide el pase a /api/apple/v1/passes/…
 * Usa UNA conexión HTTP/2 para todos los envíos (miles de pases por llamada).
 */
export async function pushToSerials(serials: string[]): Promise<PushResult> {
  if (!serials.length) return { sent: 0, failed: 0, devices: 0 };

  const tokens = new Map<string, string>(); // push_token → dispositivo
  for (let i = 0; i < serials.length; i += CHUNK) {
    const { data } = await db()
      .from("apple_registrations")
      .select("device_library_identifier, apple_devices(push_token)")
      .in("serial_number", serials.slice(i, i + CHUNK));
    type Row = { device_library_identifier: string; apple_devices: { push_token: string } | { push_token: string }[] | null };
    for (const r of (data ?? []) as Row[]) {
      const dev = Array.isArray(r.apple_devices) ? r.apple_devices[0] : r.apple_devices;
      if (dev?.push_token) tokens.set(dev.push_token, r.device_library_identifier);
    }
  }
  if (!tokens.size) return { sent: 0, failed: 0, devices: 0 };

  const certs = appleCertificates();
  const topic = requireEnv("APPLE_PASS_TYPE_ID");
  const client = http2.connect(`https://${process.env.APPLE_APNS_HOST || "api.push.apple.com"}:443`, {
    cert: certs.signerCert,
    key: certs.signerKey,
    passphrase: certs.signerKeyPassphrase,
  });

  let sent = 0;
  let failed = 0;
  let transient = 0;
  const dead: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });

    const entries = [...tokens.entries()];
    // Envíos en paralelo, en grupos para no saturar la conexión
    for (let i = 0; i < entries.length; i += 100) {
      await Promise.all(
        entries.slice(i, i + 100).map(
          ([token, device]) =>
            new Promise<void>((resolve) => {
              const req = client.request({
                ":method": "POST",
                ":path": `/3/device/${token}`,
                "apns-topic": topic,
                "content-type": "application/json",
              });
              let status = 0;
              let body = "";
              req.setEncoding("utf8");
              req.setTimeout(10_000, () => req.close(http2.constants.NGHTTP2_CANCEL));
              req.on("response", (h) => (status = Number(h[":status"])));
              req.on("data", (d) => (body += d));
              req.on("end", () => {
                if (status === 200) sent++;
                else {
                  failed++;
                  if (status === 410 || body.includes("BadDeviceToken") || body.includes("Unregistered")) dead.push(device);
                  else if (status === 0 || status >= 500 || status === 429) transient++;
                }
                resolve();
              });
              req.on("error", () => {
                failed++;
                transient++;
                resolve();
              });
              req.end("{}");
            }),
        ),
      );
    }
  } finally {
    client.close();
  }

  if (dead.length) await db().from("apple_devices").delete().in("device_library_identifier", dead);
  // Si falló por causas temporales de Apple, se lanza para que la cola reintente
  if (transient > 0 && transient === failed && sent === 0) throw new Error(`APNs no disponible (${transient} fallos temporales)`);
  return { sent, failed, devices: tokens.size };
}
