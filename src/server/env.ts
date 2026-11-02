import "server-only";

/** Variable obligatoria: truena con un mensaje claro si falta. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Revisa .env.local (ver .env.example).`);
  return value;
}

/** URL pública HTTPS de la app, sin diagonal final. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Qué integraciones están listas. La app funciona sin ellas (modo demo de wallet). */
export const features = {
  get apple() {
    return Boolean(
      process.env.APPLE_PASS_TYPE_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_WWDR_CERT_BASE64 &&
        process.env.APPLE_SIGNER_CERT_BASE64 &&
        process.env.APPLE_SIGNER_KEY_BASE64,
    );
  },
  get google() {
    return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SA_JSON_BASE64);
  },
  get mercadopago() {
    return Boolean(process.env.MP_ACCESS_TOKEN);
  },
};

export const COOKIE_BUSINESS = "ym_biz";
export const COOKIE_LOCATION = "ym_loc";
