import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCohorts,
  buildHeatmap,
  campaignMessage,
  compareWithPeers,
  EMPTY_SEGMENTS,
  lifecycleOf,
  normalizeSegments,
  recommendations,
  returningRate,
  type SegmentCounts,
} from "./insights";

const now = new Date("2026-10-22T18:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

test("ciclo de vida igual que en SQL", () => {
  assert.equal(lifecycleOf({ visits: 1, lastVisitAt: ago(10), createdAt: ago(10) }, now), "nuevo");
  assert.equal(lifecycleOf({ visits: 6, lastVisitAt: ago(5), createdAt: ago(100) }, now), "frecuente");
  assert.equal(lifecycleOf({ visits: 2, lastVisitAt: ago(20), createdAt: ago(60) }, now), "ocasional");
  assert.equal(lifecycleOf({ visits: 3, lastVisitAt: ago(45), createdAt: ago(120) }, now), "en_riesgo");
  assert.equal(lifecycleOf({ visits: 2, lastVisitAt: ago(120), createdAt: ago(200) }, now), "perdido");
  assert.equal(lifecycleOf({ visits: 0, lastVisitAt: null, createdAt: ago(50) }, now), "perdido");
});

test("segmentos desde la base y tasa de regreso", () => {
  const s = normalizeSegments({ total: "7", nuevo: 1, con_visita: 6, regresan: 4, dias_entre_visitas: "38.8" });
  assert.equal(s.total, 7);
  assert.equal(s.dias_entre_visitas, 38.8);
  assert.equal(returningRate(s), 67);
  assert.equal(returningRate(EMPTY_SEGMENTS), null);
  assert.equal(normalizeSegments(null).dias_entre_visitas, null);
});

test("mapa de horas: pico y ventana floja dentro del horario", () => {
  const cells = [
    { dow: 5, hour: 13, visits: 30 }, { dow: 5, hour: 14, visits: 20 },
    { dow: 1, hour: 13, visits: 10 }, { dow: 1, hour: 14, visits: 1 }, { dow: 1, hour: 15, visits: 1 },
    { dow: 2, hour: 13, visits: 8 }, { dow: 2, hour: 14, visits: 9 }, { dow: 2, hour: 15, visits: 7 },
    { dow: 6, hour: 7, visits: 1 }, // una visita suelta a las 7 am no define el horario
  ];
  const h = buildHeatmap(cells);
  assert.deepEqual(h.peak, { dow: 5, hour: 13, visits: 30 });
  assert.equal(h.fromHour, 7);
  assert.equal(h.toHour, 15);
  assert.equal(h.total, 87);
  assert.deepEqual(h.weakest, { dow: 1, hour: 14, visits: 2 });
  assert.equal(buildHeatmap([]).peak, null);
});

test("cohortes: porcentaje por mes y meses que aún no llegan", () => {
  const rows = [
    { cohort: "2026-09-01", size: 20, month_offset: 0, active: 20 },
    { cohort: "2026-09-01", size: 20, month_offset: 1, active: 9 },
    { cohort: "2026-10-01", size: 10, month_offset: 0, active: 10 },
    { cohort: "2026-08-01", size: 5, month_offset: null, active: 0 },
  ];
  const c = buildCohorts(rows, now);
  assert.deepEqual(c.map((x) => x.cohort), ["2026-08-01", "2026-09-01", "2026-10-01"]);
  assert.deepEqual(c[1].pct, [100, 45, null, null, null, null]);
  assert.deepEqual(c[0].pct, [0, 0, 0, null, null, null]);
});

test("recomendaciones ordenadas por impacto", () => {
  const s: SegmentCounts = { ...EMPTY_SEGMENTS, total: 120, casi: 12, premio: 3, en_riesgo: 20, una_visita: 30, con_visita: 100, regresan: 30, activos_30d: 60, dias_entre_visitas: 14, nuevo: 4, visitas_30d: 150 };
  const recs = recommendations({
    segments: s,
    heatmap: buildHeatmap([{ dow: 0, hour: 9, visits: 30 }, { dow: 0, hour: 10, visits: 2 }, { dow: 1, hour: 9, visits: 25 }, { dow: 1, hour: 10, visits: 20 }]),
    benchmark: { businesses: 8, returning_rate: 45, visits_per_active: 2.4, days_between_visits: 10, enrollments_30d: 20 },
    category: "cafeteria",
    stampsRequired: 10,
    businessName: "Café La Esquina",
    reward: "Un café gratis",
  });
  const ids = recs.map((r) => r.id);
  assert.equal(ids[0], "riesgo");
  assert.ok(ids.includes("casi") && ids.includes("premio") && ids.includes("una-visita"));
  assert.ok(ids.includes("tarjeta-larga"), "14 días × 9 = 126 días para completar");
  assert.ok(ids.includes("giro-abajo"), "30 % contra 45 % del giro");
  assert.ok(ids.includes("pocas-altas"));
  assert.ok(ids.includes("hora-floja"));
  const larga = recs.find((r) => r.id === "tarjeta-larga")!;
  assert.match(larga.body, /Con 5 sellos en lugar de 10/);
  assert.match(recs.find((r) => r.id === "giro-abajo")!.title, /cafeterías/);
});

test("sin datos no inventa recomendaciones de horario ni de giro", () => {
  const recs = recommendations({
    segments: { ...EMPTY_SEGMENTS, total: 400, nuevo: 50 },
    heatmap: buildHeatmap([]),
    benchmark: null,
    category: "otro",
    stampsRequired: 8,
    businessName: "X",
    reward: "Algo",
  });
  assert.deepEqual(recs, []);
});

test("mensajes de WhatsApp", () => {
  const v = { name: "Ana López", business: "Café La Esquina", reward: "Un café gratis", stamps: 7, required: 8, cardUrl: "https://yamerito.mx/c/x" };
  assert.equal(campaignMessage("casi", v), "¡Hola Ana! Ya merito: te falta 1 sello para un café gratis en Café La Esquina. ¡Te esperamos!");
  assert.match(campaignMessage("riesgo", v), /sello doble.*7 de 8.*yamerito\.mx\/c\/x/);
});

test("comparativo con el giro", () => {
  const s: SegmentCounts = { ...EMPTY_SEGMENTS, con_visita: 50, regresan: 20, activos_30d: 20, visitas_30d: 50, dias_entre_visitas: 12, nuevo: 9 };
  const c = compareWithPeers(s, { businesses: 6, returning_rate: 38, visits_per_active: 2, days_between_visits: 15, enrollments_30d: 12 });
  assert.deepEqual(c.map((x) => [x.own, x.peer]), [[40, 38], [2.5, 2], [12, 15], [9, 12]]);
  assert.equal(compareWithPeers(s, null)[0].peer, null);
});
