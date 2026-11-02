import "server-only";
import { AppError } from "@/core/errors";
import { can, type StaffContext } from "@/server/auth/session";
import { db, dbAsUser } from "@/server/db";
import type { CardEventKind } from "@/server/types";

export interface DashboardStats {
  customers: number;
  rewards_ready: number;
  stamps_today: number;
  visits_today: number;
  enrollments_month: number;
  redemptions_month: number;
  returning_rate: number;
}

export interface DayPoint {
  day: string;
  stamps: number;
  redemptions: number;
  enrollments: number;
  visits: number;
}

export interface ActivityItem {
  id: number;
  kind: CardEventKind;
  delta: number;
  at: string;
  customerName: string;
  customerId: string | null;
  by: string | null;
}

export interface Checklist {
  logo: boolean;
  design: boolean;
  firstCustomer: boolean;
  team: boolean;
  firstStamp: boolean;
}

/** Fecha (YYYY-MM-DD) en la zona horaria del negocio. */
export function localDay(timezone: string, offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function getDashboard(ctx: StaffContext) {
  const sb = await dbAsUser();
  const [{ data: stats }, { data: series }, { data: events }, { count: teamCount }] = await Promise.all([
    db().rpc("dashboard_stats", { p_business_id: ctx.business.id }),
    db().rpc("report_daily", {
      p_business_id: ctx.business.id,
      p_from: localDay(ctx.business.timezone, -13),
      p_to: localDay(ctx.business.timezone),
      p_location_id: null,
    }),
    sb
      .from("card_events")
      .select("id, kind, delta, created_at, memberships(name), cards(customers(id, name))")
      .eq("business_id", ctx.business.id)
      .in("kind", ["stamp", "redeem", "enroll"])
      .order("id", { ascending: false })
      .limit(8),
    db().from("memberships").select("*", { count: "exact", head: true }).eq("business_id", ctx.business.id),
  ]);

  const s = (stats ?? {}) as Partial<DashboardStats>;
  const full: DashboardStats = {
    customers: s.customers ?? 0,
    rewards_ready: s.rewards_ready ?? 0,
    stamps_today: s.stamps_today ?? 0,
    visits_today: s.visits_today ?? 0,
    enrollments_month: s.enrollments_month ?? 0,
    redemptions_month: s.redemptions_month ?? 0,
    returning_rate: s.returning_rate ?? 0,
  };

  type EventRow = {
    id: number;
    kind: CardEventKind;
    delta: number;
    created_at: string;
    memberships: { name: string } | null;
    cards: { customers: { id: string; name: string } | null } | null;
  };
  const activity: ActivityItem[] = ((events ?? []) as EventRow[]).map((e) => ({
    id: e.id,
    kind: e.kind,
    delta: e.delta,
    at: e.created_at,
    customerName: e.cards?.customers?.name ?? "Cliente",
    customerId: e.cards?.customers?.id ?? null,
    by: e.memberships?.name || null,
  }));

  const programEdited = new Date(ctx.program.updated_at).getTime() - new Date(ctx.program.created_at).getTime() > 2000;
  const checklist: Checklist = {
    logo: Boolean(ctx.business.logo_url),
    design: programEdited,
    firstCustomer: full.customers > 0,
    team: (teamCount ?? 0) > 1,
    firstStamp: activity.some((a) => a.kind === "stamp") || full.redemptions_month > 0,
  };

  return { stats: full, series: (series ?? []) as DayPoint[], activity, checklist };
}

export interface StaffRow {
  membership_id: string | null;
  name: string;
  stamps: number;
  redemptions: number;
  undos: number;
}

export async function getReport(ctx: StaffContext, opts: { days: number; locationId?: string | null }) {
  if (!can(ctx, "reports")) throw new AppError("forbidden");
  const full = ctx.access.plan.features.reports;
  // Esencial ve los últimos 7 días; Pro y Cadena, el rango que quieran
  const days = full ? Math.min(Math.max(opts.days, 7), 365) : 7;
  const tz = ctx.business.timezone;
  const from = localDay(tz, -(days - 1));
  const to = localDay(tz);

  const [{ data: series }, { data: staff }] = await Promise.all([
    db().rpc("report_daily", { p_business_id: ctx.business.id, p_from: from, p_to: to, p_location_id: opts.locationId ?? null }),
    full
      ? db().rpc("report_staff", {
          p_business_id: ctx.business.id,
          p_from: new Date(Date.now() - days * 86_400_000).toISOString(),
          p_to: new Date().toISOString(),
        })
      : Promise.resolve({ data: [] as StaffRow[] }),
  ]);

  const points = (series ?? []) as DayPoint[];
  const totals = points.reduce(
    (acc, p) => ({
      stamps: acc.stamps + p.stamps,
      redemptions: acc.redemptions + p.redemptions,
      enrollments: acc.enrollments + p.enrollments,
      visits: acc.visits + p.visits,
    }),
    { stamps: 0, redemptions: 0, enrollments: 0, visits: 0 },
  );
  return { days, full, from, to, series: points, staff: (staff ?? []) as StaffRow[], totals };
}

/** CSV de movimientos para Excel (UTF-8 con BOM). */
export async function exportEventsCsv(ctx: StaffContext, days: number): Promise<string> {
  if (!can(ctx, "reports")) throw new AppError("forbidden");
  if (!ctx.access.plan.features.export) throw new AppError("feature_locked");
  const since = new Date(Date.now() - Math.min(days, 366) * 86_400_000).toISOString();

  const header = ["fecha", "movimiento", "sellos", "saldo", "cliente", "celular", "cajero", "sucursal", "folio", "premio"];
  const lines = [header.join(",")];
  const fmt = new Intl.DateTimeFormat("es-MX", { timeZone: ctx.business.timezone, dateStyle: "short", timeStyle: "short" });
  const labels: Record<CardEventKind, string> = { enroll: "alta", stamp: "sello", redeem: "canje", undo: "deshacer", adjust: "ajuste" };
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  type Row = {
    id: number;
    kind: CardEventKind;
    delta: number;
    stamps_after: number;
    ticket_ref: string | null;
    reward_description: string | null;
    created_at: string;
    memberships: { name: string } | null;
    locations: { name: string } | null;
    cards: { customers: { name: string; phone: string } | null } | null;
  };

  // Paginado por id para no cargar todo en memoria de golpe
  let lastId = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < 100; i++) {
    const { data } = await db()
      .from("card_events")
      .select("id, kind, delta, stamps_after, ticket_ref, reward_description, created_at, memberships(name), locations(name), cards(customers(name, phone))")
      .eq("business_id", ctx.business.id)
      .gte("created_at", since)
      .lt("id", lastId)
      .order("id", { ascending: false })
      .limit(1000);
    const rows = (data ?? []) as Row[];
    for (const r of rows) {
      lines.push(
        [
          fmt.format(new Date(r.created_at)),
          labels[r.kind],
          r.delta,
          r.stamps_after,
          r.cards?.customers?.name,
          r.cards?.customers?.phone,
          r.memberships?.name,
          r.locations?.name,
          r.ticket_ref,
          r.reward_description,
        ]
          .map(esc)
          .join(","),
      );
    }
    if (rows.length < 1000) break;
    lastId = rows[rows.length - 1].id;
  }
  return "﻿" + lines.join("\n");
}
