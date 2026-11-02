import { test } from "node:test";
import assert from "node:assert/strict";
import { enrollSchema, firstIssue, programSchema, signUpSchema, stampSchema } from "./schemas";

test("registro: limpia y valida", () => {
  const ok = signUpSchema.safeParse({
    businessName: "  Café   La Esquina ",
    category: "cafeteria",
    ownerName: "Lupita  Pérez",
    email: " Lupita@Cafe.MX ",
    password: "secreto123",
  });
  assert.ok(ok.success);
  assert.equal(ok.data.businessName, "Café La Esquina");
  assert.equal(ok.data.email, "lupita@cafe.mx");

  const bad = signUpSchema.safeParse({ businessName: "C", category: "x", ownerName: "", email: "no", password: "123" });
  assert.equal(bad.success, false);
  if (!bad.success) assert.ok(Object.keys(firstIssue(bad.error).fields).length >= 4);
});

test("alta de cliente: celular a 10 dígitos y trampa para bots", () => {
  const ok = enrollSchema.safeParse({ slug: "cafe-la-esquina", name: "Ana", phone: "+52 1 81 1234 5678" });
  assert.ok(ok.success);
  assert.equal(ok.data.phone, "8112345678");
  assert.equal(enrollSchema.safeParse({ slug: "cafe-la-esquina", name: "Ana", phone: "123" }).success, false);
  assert.equal(enrollSchema.safeParse({ slug: "cafe-la-esquina", name: "Ana", phone: "8112345678", website: "spam" }).success, false);
});

test("sello: valores por defecto", () => {
  const ok = stampSchema.safeParse({ serial: "3F1C2A9E-7B4D-4E21-9A55-0C6F8D2E1B77" });
  assert.ok(ok.success);
  assert.deepEqual([ok.data.qty, ok.data.force, ok.data.serial.startsWith("3f1c")], [1, false, true]);
});

test("tarjeta: colores y límites", () => {
  const base = {
    rewardDescription: "Un café gratis",
    stampsRequired: "8",
    backgroundColor: "#17152B",
    foregroundColor: "#FFFFFF",
    labelColor: "#FF8A1F",
    stampIcon: "cup",
    terms: "  ",
  };
  const ok = programSchema.safeParse(base);
  assert.ok(ok.success);
  assert.equal(ok.data.stampsRequired, 8);
  assert.equal(ok.data.terms, null);
  assert.equal(programSchema.safeParse({ ...base, stampsRequired: 30 }).success, false);
  assert.equal(programSchema.safeParse({ ...base, labelColor: "naranja" }).success, false);
});
