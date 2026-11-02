import "server-only";
import { timingSafeEqual } from "node:crypto";
import { PKPass } from "passkit-generator";
import { hexToRgb } from "@/core/colors";
import { appleChangeMessage, cardStatus } from "@/core/loyalty";
import { appUrl, requireEnv } from "@/server/env";
import { appleImages } from "@/server/integrations/images";
import type { CardBundle } from "@/server/types";

const decode = (name: string) => Buffer.from(requireEnv(name), "base64").toString("utf8");

export function appleCertificates() {
  return {
    wwdr: decode("APPLE_WWDR_CERT_BASE64"),
    signerCert: decode("APPLE_SIGNER_CERT_BASE64"),
    signerKey: decode("APPLE_SIGNER_KEY_BASE64"),
    signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
  };
}

/** Contenido de pass.json para un storeCard de sellos. */
export function buildPassJson(b: CardBundle) {
  const { card, program, business, customer } = b;
  const state = { stamps: card.stamps, required: program.stamps_required, redemptions: card.redemptions };
  const s = cardStatus(state);

  return {
    formatVersion: 1,
    passTypeIdentifier: requireEnv("APPLE_PASS_TYPE_ID"),
    teamIdentifier: requireEnv("APPLE_TEAM_ID"),
    serialNumber: card.serial_number,
    authenticationToken: card.auth_token,
    webServiceURL: `${appUrl()}/api/apple`,
    organizationName: business.name,
    description: `Tarjeta de sellos de ${business.name}`,
    logoText: business.name,
    backgroundColor: hexToRgb(program.background_color),
    foregroundColor: hexToRgb(program.foreground_color),
    labelColor: hexToRgb(program.label_color),
    sharingProhibited: true,
    storeCard: {
      headerFields: [
        {
          key: "sellos",
          label: "SELLOS",
          value: s.counter,
          textAlignment: "PKTextAlignmentRight",
          changeMessage: appleChangeMessage(state),
        },
      ],
      secondaryFields: [{ key: "premio", label: s.complete ? "¡PREMIO LISTO!" : "TU PREMIO", value: program.reward_description }],
      auxiliaryFields: [
        { key: "cliente", label: "CLIENTE", value: customer.name },
        { key: "faltan", label: "TE FALTAN", value: s.remainingLabel, textAlignment: "PKTextAlignmentRight" },
      ],
      backFields: [
        {
          key: "como",
          label: "¿Cómo funciona?",
          value: `Muestra este pase en caja cada vez que compres. Al juntar ${program.stamps_required} sellos te ganas: ${program.reward_description}.`,
        },
        ...(program.terms ? [{ key: "terminos", label: "Términos", value: program.terms }] : []),
        ...(business.address ? [{ key: "direccion", label: "Dirección", value: business.address }] : []),
        ...(business.phone ? [{ key: "telefono", label: "Teléfono", value: business.phone }] : []),
        { key: "tarjeta", label: "Ver mi tarjeta", value: `${appUrl()}/c/${card.serial_number}` },
        { key: "ym", label: "Tarjeta digital por", value: "Ya Merito · yamerito.mx" },
      ],
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: card.serial_number,
        messageEncoding: "iso-8859-1",
        altText: card.serial_number.slice(0, 8).toUpperCase(),
      },
    ],
  };
}

/** Genera el .pkpass firmado. */
export async function buildApplePass(b: CardBundle): Promise<Buffer> {
  const images = await appleImages(b.business, b.program, b.card.stamps);
  const pass = new PKPass({ ...images, "pass.json": Buffer.from(JSON.stringify(buildPassJson(b))) }, appleCertificates());
  return pass.getAsBuffer();
}

/** Revisa "Authorization: ApplePass <token>" en tiempo constante. */
export function checkAppleAuth(request: Request, expected: string): boolean {
  const token = (request.headers.get("authorization") ?? "").replace(/^ApplePass\s+/i, "");
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
