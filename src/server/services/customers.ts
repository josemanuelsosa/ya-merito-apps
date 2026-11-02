import "server-only";
import { AppError } from "@/core/errors";
import { cardStatus } from "@/core/loyalty";
import { can, type StaffContext } from "@/server/auth/session";
import { dbAsUser } from "@/server/db";
import type { CardEvent, CardEventKind } from "@/server/types";

/** Filtros de la lista; casi, riesgo, una-visita y perdidos son las campañas del estudio de mercado. */
export type CustomerFilter = "todos" | "premio" | "casi" | "nuevos" | "riesgo" | "una-visita" | "perdidos";
export const PAGE_SIZE = 30;

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  serial: string;
  stamps: number;
  required: number;
  visits: number;
  redemptions: number;
  lastVisitAt: string | null;
  createdAt: string;
  complete: boolean;
}

type ListRow = {
  serial_number: string;
  stamps: number;
  visits: number;
  redemptions: number;
  last_stamp_at: string | null;
  created_at: string;
  customers: { id: string; name: string; phone: string };
};

/** Lista paginada con búsqueda (nombre o celular) y filtros. Lee con RLS. */
export async function listCustomers(
  ctx: StaffContext,
  opts: { q?: string; filter?: CustomerFilter; page?: number },
): Promise<{ rows: CustomerRow[]; total: number; page: number; pages: number }> {
  if (!can(ctx, "customers.view")) throw new AppError("forbidden");
  const page = Math.max(0, opts.page ?? 0);
  const required = ctx.program.stamps_required;
  const sb = await dbAsUser();

  let query = sb
    .from("cards")
    .select("serial_number, stamps, visits, redemptions, last_stamp_at, created_at, customers!inner(id, name, phone)", { count: "exact" })
    .eq("program_id", ctx.program.id);

  const q = (opts.q ?? "").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3) query = query.like("customers.phone", `%${digits}%`);
    else query = query.ilike("customers.name", `%${q.replace(/[%_]/g, "")}%`);
  }

  // Mismas reglas que insights_segments() (0007) y core/insights.ts
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  switch (opts.filter) {
    case "premio":
      query = query.gte("stamps", required);
      break;
    case "casi":
      query = query.eq("stamps", required - 1);
      break;
    case "nuevos":
      query = query.gte("created_at", daysAgo(30));
      break;
    case "riesgo":
      query = query.lt("created_at", daysAgo(30)).lt("last_stamp_at", daysAgo(30)).gte("last_stamp_at", daysAgo(90));
      break;
    case "una-visita":
      query = query.eq("visits", 1).lt("last_stamp_at", daysAgo(14)).gte("last_stamp_at", daysAgo(90));
      break;
    case "perdidos":
      query = query.lt("created_at", daysAgo(30)).or(`last_stamp_at.is.null,last_stamp_at.lt.${daysAgo(90)}`);
      break;
  }

  const { data, count } = await query
    .order("updated_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const rows = ((data ?? []) as ListRow[]).map((r) => ({
    id: r.customers.id,
    name: r.customers.name,
    phone: r.customers.phone,
    serial: r.serial_number,
    stamps: r.stamps,
    required,
    visits: r.visits,
    redemptions: r.redemptions,
    lastVisitAt: r.last_stamp_at,
    createdAt: r.created_at,
    complete: r.stamps >= required,
  }));
  const total = count ?? 0;
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export interface CustomerEvent {
  id: number;
  kind: CardEventKind;
  delta: number;
  stampsAfter: number;
  at: string;
  by: string | null;
  location: string | null;
  ticketRef: string | null;
  reward: string | null;
}

export interface CustomerDetail {
  row: CustomerRow;
  headline: string;
  events: CustomerEvent[];
}

export async function getCustomer(ctx: StaffContext, customerId: string): Promise<CustomerDetail | null> {
  if (!can(ctx, "customers.view")) throw new AppError("forbidden");
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return null;
  const sb = await dbAsUser();
  const { data } = await sb
    .from("cards")
    .select("id, serial_number, stamps, visits, redemptions, last_stamp_at, created_at, customers!inner(id, name, phone)")
    .eq("program_id", ctx.program.id)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!data) return null;
  const card = data as ListRow & { id: string };

  const { data: events } = await sb
    .from("card_events")
    .select("*, memberships(name), locations(name)")
    .eq("card_id", card.id)
    .order("id", { ascending: false })
    .limit(60);

  const required = ctx.program.stamps_required;
  return {
    row: {
      id: card.customers.id,
      name: card.customers.name,
      phone: card.customers.phone,
      serial: card.serial_number,
      stamps: card.stamps,
      required,
      visits: card.visits,
      redemptions: card.redemptions,
      lastVisitAt: card.last_stamp_at,
      createdAt: card.created_at,
      complete: card.stamps >= required,
    },
    headline: cardStatus({ stamps: card.stamps, required, redemptions: card.redemptions }).headline,
    events: ((events ?? []) as (CardEvent & { memberships: { name: string } | null; locations: { name: string } | null })[]).map((e) => ({
      id: e.id,
      kind: e.kind,
      delta: e.delta,
      stampsAfter: e.stamps_after,
      at: e.created_at,
      by: e.memberships?.name || null,
      location: e.locations?.name ?? null,
      ticketRef: e.ticket_ref,
      reward: e.reward_description,
    })),
  };
}
