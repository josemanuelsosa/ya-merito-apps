/**
 * Pruebas del núcleo (reglas puras). Corren sin base de datos:
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { appleChangeMessage, cardStatus, maxStampsNow } from "./loyalty";
import { formatMxPhone, maskPhone, normalizeMxPhone } from "./phone";
import { accessFor, monthlyEquivalent, planFor, PLANS, priceFor, withinLimit } from "./plans";
import { firstName, initials, slugify } from "./text";
import { contrastRatio, hexToRgb } from "./colors";
import { stampStripSvg, stripLayout } from "./stamp-art";

test("estado de la tarjeta", () => {
  assert.equal(cardStatus({ stamps: 0, required: 8, redemptions: 0 }).headline, "Junta tu primer sello");
  assert.equal(cardStatus({ stamps: 3, required: 8, redemptions: 0 }).headline, "Te faltan 5 sellos");
  assert.equal(cardStatus({ stamps: 7, required: 8, redemptions: 0 }).headline, "¡Ya merito! Te falta 1 sello");
  const full = cardStatus({ stamps: 8, required: 8, redemptions: 0 });
  assert.equal(full.complete, true);
  assert.equal(full.counter, "8/8");
  assert.equal(full.remainingLabel, "¡Ya es tuyo!");
  assert.equal(cardStatus({ stamps: 0, required: 8, redemptions: 2 }).headline, "Tarjeta nueva, ¡a juntar otra vez!");
  assert.equal(cardStatus({ stamps: 4, required: 8, redemptions: 0 }).progress, 0.5);
});

test("mensajes de Apple llevan %@", () => {
  for (const s of [1, 7, 8]) assert.match(appleChangeMessage({ stamps: s, required: 8, redemptions: 0 }), /%@/);
  assert.match(appleChangeMessage({ stamps: 0, required: 8, redemptions: 1 }), /empieza de nuevo/);
});

test("máximo de sellos por visita", () => {
  assert.equal(maxStampsNow({ stamps: 6, required: 8, redemptions: 0 }, 3), 2);
  assert.equal(maxStampsNow({ stamps: 8, required: 8, redemptions: 0 }, 3), 0);
  assert.equal(maxStampsNow({ stamps: 0, required: 8, redemptions: 0 }, 3), 3);
});

test("celulares de México", () => {
  assert.equal(normalizeMxPhone("81 1234 5678"), "8112345678");
  assert.equal(normalizeMxPhone("+52 81 1234 5678"), "8112345678");
  assert.equal(normalizeMxPhone("52 1 81 1234 5678"), "8112345678");
  assert.equal(normalizeMxPhone("(81) 1234-5678"), "8112345678");
  assert.equal(normalizeMxPhone("12345"), null);
  assert.equal(formatMxPhone("8112345678"), "81 1234 5678");
  assert.equal(maskPhone("8112345678"), "•• •••• 5678");
});

test("acceso según suscripción", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

  const trial = accessFor({ plan: "pro", status: "trialing", trial_ends_at: inDays(5), current_period_end: null }, now);
  assert.deepEqual([trial.phase, trial.canOperate, trial.daysLeft], ["trial", true, 5]);

  const expired = accessFor({ plan: "pro", status: "trialing", trial_ends_at: inDays(-1), current_period_end: null }, now);
  assert.deepEqual([expired.phase, expired.canOperate], ["expired", false]);

  assert.equal(accessFor({ plan: "esencial", status: "active", trial_ends_at: null, current_period_end: inDays(20) }, now).canOperate, true);

  const grace = accessFor({ plan: "pro", status: "past_due", trial_ends_at: null, current_period_end: inDays(-2) }, now);
  assert.deepEqual([grace.phase, grace.canOperate, grace.daysLeft], ["grace", true, 3]);
  assert.equal(accessFor({ plan: "pro", status: "past_due", trial_ends_at: null, current_period_end: inDays(-6) }, now).canOperate, false);

  assert.equal(accessFor({ plan: "pro", status: "canceled", trial_ends_at: null, current_period_end: inDays(3) }, now).canOperate, true);
  assert.equal(accessFor({ plan: "pro", status: "canceled", trial_ends_at: null, current_period_end: inDays(-1) }, now).canOperate, false);
  assert.equal(accessFor(null, now).canOperate, false);
});

test("límites y precios", () => {
  assert.equal(withinLimit(PLANS.esencial, "locations", 0), true);
  assert.equal(withinLimit(PLANS.esencial, "locations", 1), false);
  assert.equal(planFor("locations", 2), "pro");
  assert.equal(planFor("staff", 11), "cadena");
  assert.equal(planFor("locations", 99), null);
  assert.equal(priceFor("pro", "yearly"), PLANS.pro.monthly * 10);
  assert.ok(monthlyEquivalent("pro", "yearly") < PLANS.pro.monthly);
  for (const p of Object.values(PLANS)) assert.equal(p.yearly, p.monthly * 10, `${p.id}: el anual son 10 meses`);
});

test("textos", () => {
  assert.equal(slugify("Café La Esquina!"), "cafe-la-esquina");
  assert.equal(slugify("Tacos & Más"), "tacos-y-mas");
  assert.equal(slugify("Ño"), "no-ym");
  assert.ok(slugify("x".repeat(100)).length <= 44);
  assert.equal(firstName("  Ana   López "), "Ana");
  assert.equal(initials("ana lópez"), "AL");
});

test("colores", () => {
  assert.equal(hexToRgb("#17152B"), "rgb(23, 21, 43)");
  assert.ok(contrastRatio("#FFFFFF", "#17152B") > 15);
});

test("franja de sellos", () => {
  assert.deepEqual(stripLayout(5), { rows: 1, cols: 5 });
  assert.deepEqual(stripLayout(10), { rows: 2, cols: 5 });
  const svg = stampStripSvg({
    width: 750, height: 246, stamps: 3, required: 8,
    backgroundColor: "#17152B", foregroundColor: "#FFFFFF", accentColor: "#FF8A1F", icon: "taco",
  });
  assert.equal((svg.match(/<circle/g) ?? []).length, 8);
  assert.equal((svg.match(/fill="#FF8A1F"/g) ?? []).length, 3);
});
