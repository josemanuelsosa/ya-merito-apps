import "server-only";
import { AppError } from "@/core/errors";
import {
  buildCohorts,
  buildHeatmap,
  compareWithPeers,
  normalizeSegments,
  recommendations,
  type Benchmark,
  type CohortRow,
  type HeatCell,
} from "@/core/insights";
import { can, type StaffContext } from "@/server/auth/session";
import { db } from "@/server/db";

export interface LocationRow {
  location_id: string;
  name: string;
  visits: number;
  stamps: number;
  redemptions: number;
  enrollments: number;
}

/**
 * Estudio de mercado del negocio. Cuatro consultas en paralelo; ninguna
 * recorre el libro completo (solo 90 días de sellos para el mapa de horas).
 * Plan Esencial: segmentos y las 2 recomendaciones básicas de más impacto.
 */
export async function getInsights(ctx: StaffContext) {
  if (!can(ctx, "reports")) throw new AppError("forbidden");
  const full = ctx.access.plan.features.insights === "full";
  const id = ctx.business.id;

  const [seg, heat, cohorts, bench, locs] = await Promise.all([
    db().rpc("insights_segments", { p_business_id: id }),
    full ? db().rpc("insights_heatmap", { p_business_id: id, p_days: 90 }) : Promise.resolve({ data: [] }),
    full ? db().rpc("insights_cohorts", { p_business_id: id, p_months: 6 }) : Promise.resolve({ data: [] }),
    full
      ? db().from("category_benchmarks").select("*").eq("category", ctx.business.category).maybeSingle<Benchmark & { computed_at: string }>()
      : Promise.resolve({ data: null }),
    ctx.access.plan.features.locationCompare && ctx.locations.length > 1
      ? db().rpc("insights_locations", { p_business_id: id, p_days: 30 })
      : Promise.resolve({ data: [] }),
  ]);
  if (seg.error) throw new AppError("unknown");

  const segments = normalizeSegments(seg.data);
  const heatmap = buildHeatmap((heat.data ?? []) as HeatCell[]);
  const benchmark = (bench.data as (Benchmark & { computed_at: string }) | null) ?? null;
  const allRecs = recommendations({
    segments,
    heatmap,
    benchmark,
    category: ctx.business.category,
    stampsRequired: ctx.program.stamps_required,
    businessName: ctx.business.name,
    reward: ctx.program.reward_description,
  });
  const visible = full ? allRecs : allRecs.filter((r) => !r.full).slice(0, 2);

  return {
    full,
    segments,
    heatmap,
    cohorts: buildCohorts((cohorts.data ?? []) as CohortRow[]),
    comparison: full ? compareWithPeers(segments, benchmark) : [],
    benchmark,
    locations: (locs.data ?? []) as LocationRow[],
    recommendations: visible,
    lockedRecommendations: allRecs.length - visible.length,
  };
}

export type Insights = Awaited<ReturnType<typeof getInsights>>;

/** La recomendación de más impacto, para el inicio del panel. */
export async function topRecommendation(ctx: StaffContext) {
  if (!can(ctx, "reports")) return null;
  const { data } = await db().rpc("insights_segments", { p_business_id: ctx.business.id });
  const recs = recommendations({
    segments: normalizeSegments(data),
    heatmap: buildHeatmap([]),
    benchmark: null,
    category: ctx.business.category,
    stampsRequired: ctx.program.stamps_required,
    businessName: ctx.business.name,
    reward: ctx.program.reward_description,
  });
  return recs.find((r) => !r.full) ?? null;
}
