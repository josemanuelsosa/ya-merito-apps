import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyMercadoPagoSignature } from "./signature";

const secret = "secreto-de-prueba";
const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

test("firma válida de Mercado Pago", () => {
  const v1 = sign("id:123456;request-id:abc-1;ts:1704908010;");
  assert.equal(
    verifyMercadoPagoSignature({ xSignature: `ts=1704908010,v1=${v1}`, xRequestId: "abc-1", dataId: "123456", secret }),
    true,
  );
});

test("se omiten las partes vacías del manifiesto", () => {
  const v1 = sign("id:123456;ts:1704908010;");
  assert.equal(verifyMercadoPagoSignature({ xSignature: `ts=1704908010, v1=${v1}`, xRequestId: null, dataId: "123456", secret }), true);
});

test("rechaza firmas alteradas, vencidas o mal formadas", () => {
  const v1 = sign("id:123456;request-id:abc-1;ts:1704908010;");
  assert.equal(verifyMercadoPagoSignature({ xSignature: `ts=1704908010,v1=${v1}`, xRequestId: "abc-1", dataId: "999", secret }), false);
  assert.equal(
    verifyMercadoPagoSignature({
      xSignature: `ts=1704908010,v1=${v1}`,
      xRequestId: "abc-1",
      dataId: "123456",
      secret,
      toleranceSeconds: 300,
      now: 1704908010_000 + 3_600_000,
    }),
    false,
  );
  assert.equal(verifyMercadoPagoSignature({ xSignature: "basura", xRequestId: null, dataId: "1", secret }), false);
  assert.equal(verifyMercadoPagoSignature({ xSignature: null, xRequestId: null, dataId: "1", secret }), false);
});
