import "server-only";
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import { cardStatus } from "@/core/loyalty";
import { appUrl, requireEnv } from "@/server/env";
import { db } from "@/server/db";
import { designVersion } from "@/server/repos/cards";
import type { Business, CardBundle, Program } from "@/server/types";

/**
 * Google Wallet: una CLASE de lealtad por negocio (diseño compartido) y un
 * OBJETO por cliente (sus sellos y su QR). Cambiar el diseño = parchar la clase.
 */
const API = "https://walletobjects.googleapis.com/walletobjects/v1";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let account: ServiceAccount | null = null;
function serviceAccount(): ServiceAccount {
  account ??= JSON.parse(Buffer.from(requireEnv("GOOGLE_WALLET_SA_JSON_BASE64"), "base64").toString("utf8"));
  return account!;
}

let auth: GoogleAuth | null = null;
async function call<T = unknown>(method: "GET" | "POST" | "PATCH", path: string, data?: unknown) {
  auth ??= new GoogleAuth({ credentials: serviceAccount(), scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"] });
  const client = await auth.getClient();
  const res = await client.request<T>({ url: `${API}${path}`, method, data, validateStatus: () => true });
  return { status: res.status, data: res.data };
}

const issuer = () => requireEnv("GOOGLE_WALLET_ISSUER_ID");
export const classIdFor = (business: Business) => `${issuer()}.ym-${business.id}`;
export const objectIdFor = (serial: string) => `${issuer()}.${serial}`;
const es = (value: string) => ({ defaultValue: { language: "es-MX", value } });

function classBody(business: Business, program: Program) {
  return {
    id: classIdFor(business),
    issuerName: business.name.slice(0, 40),
    programName: program.name,
    programLogo: {
      sourceUri: { uri: business.logo_url ?? `${appUrl()}/brand/ya-merito-icon-512.png` },
      contentDescription: es(business.name),
    },
    hexBackgroundColor: program.background_color,
    countryCode: "MX",
    reviewStatus: "UNDER_REVIEW",
    localizedRewardsTierLabel: es("Premio"),
    localizedRewardsTier: es(program.reward_description),
  };
}

function objectBody(b: CardBundle) {
  const s = cardStatus({ stamps: b.card.stamps, required: b.program.stamps_required, redemptions: b.card.redemptions });
  const v = designVersion(b.program, b.business);
  return {
    id: objectIdFor(b.card.serial_number),
    classId: classIdFor(b.business),
    state: "ACTIVE",
    accountId: b.customer.phone,
    accountName: b.customer.name,
    hexBackgroundColor: b.program.background_color,
    loyaltyPoints: { label: "Sellos", balance: { string: s.counter } },
    secondaryLoyaltyPoints: {
      label: s.complete ? "Premio" : "Te faltan",
      balance: { string: s.complete ? "¡Listo!" : s.remainingLabel },
    },
    barcode: { type: "QR_CODE", value: b.card.serial_number, alternateText: b.card.serial_number.slice(0, 8).toUpperCase() },
    heroImage: {
      // Imagen compartida por todos los clientes con los mismos sellos (caché de CDN)
      sourceUri: { uri: `${appUrl()}/api/strip/${b.program.id}/${b.card.stamps}?v=${v}` },
      contentDescription: es(`${b.card.stamps} de ${b.program.stamps_required} sellos`),
    },
    textModulesData: [
      { id: "estado", header: s.headline, body: `Premio: ${b.program.reward_description}` },
      {
        id: "como",
        header: "¿Cómo funciona?",
        body: `Muestra este pase en caja cada vez que compres. Al juntar ${b.program.stamps_required} sellos te ganas: ${b.program.reward_description}.`,
      },
      ...(b.program.terms ? [{ id: "terminos", header: "Términos", body: b.program.terms }] : []),
    ],
    linksModuleData: {
      uris: [{ id: "tarjeta", uri: `${appUrl()}/c/${b.card.serial_number}`, description: "Ver mi tarjeta" }],
    },
  };
}

async function upsert(kind: "loyaltyClass" | "loyaltyObject", id: string, body: object) {
  const path = `/${kind}/${encodeURIComponent(id)}`;
  const patched = await call("PATCH", path, body);
  if (patched.status === 404) {
    const created = await call("POST", `/${kind}`, body);
    if (created.status >= 300) throw new Error(`Google ${kind} insert ${created.status}: ${JSON.stringify(created.data)}`);
    return;
  }
  if (patched.status >= 300) throw new Error(`Google ${kind} patch ${patched.status}: ${JSON.stringify(patched.data)}`);
}

/** Crea o actualiza la clase del negocio. */
export async function syncGoogleClass(business: Business, program: Program) {
  await upsert("loyaltyClass", classIdFor(business), classBody(business, program));
  if (program.google_class_id !== classIdFor(business)) {
    await db().from("programs").update({ google_class_id: classIdFor(business) }).eq("id", program.id);
  }
}

/** Al tocar "Agregar a Google Wallet": asegura clase y objeto. */
export async function ensureGoogleObject(b: CardBundle) {
  if (b.program.google_class_id !== classIdFor(b.business)) await syncGoogleClass(b.business, b.program);
  await upsert("loyaltyObject", objectIdFor(b.card.serial_number), objectBody(b));
  if (b.card.google_object_id !== objectIdFor(b.card.serial_number)) {
    await db().from("cards").update({ google_object_id: objectIdFor(b.card.serial_number) }).eq("id", b.card.id);
  }
}

/** Actualiza sellos en Google Wallet. `notify` manda aviso visible (Google limita cuántos por día). */
export async function updateGoogleObject(b: CardBundle, notify?: string) {
  if (!b.card.google_object_id) return;
  const id = encodeURIComponent(b.card.google_object_id);
  const res = await call("PATCH", `/loyaltyObject/${id}`, objectBody(b));
  if (res.status >= 300) throw new Error(`Google patch ${res.status}: ${JSON.stringify(res.data)}`);
  if (notify) {
    await call("POST", `/loyaltyObject/${id}/addMessage`, {
      message: {
        id: `m-${Date.now()}`,
        header: notify,
        body: `${b.business.name}: ${b.program.reward_description}`,
        messageType: "TEXT_AND_NOTIFY",
      },
    });
  }
}

/** Enlace "Agregar a Google Wallet" firmado con la cuenta de servicio. */
export function googleSaveUrl(serial: string): string {
  const sa = serviceAccount();
  const token = jwt.sign(
    {
      iss: sa.client_email,
      aud: "google",
      typ: "savetowallet",
      origins: [appUrl()],
      payload: { loyaltyObjects: [{ id: objectIdFor(serial) }] },
    },
    sa.private_key,
    { algorithm: "RS256" },
  );
  return `https://pay.google.com/gp/v/save/${token}`;
}
