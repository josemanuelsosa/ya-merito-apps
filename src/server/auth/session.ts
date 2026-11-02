import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/core/errors";
import { accessFor, type Access } from "@/core/plans";
import type { Role } from "@/core/catalog";
import { db, dbAsUser } from "@/server/db";
import { COOKIE_BUSINESS, COOKIE_LOCATION } from "@/server/env";
import type { Business, Location, Membership, Program, Subscription } from "@/server/types";

export interface StaffContext {
  user: { id: string; email: string | null };
  membership: Membership;
  business: Business;
  program: Program;
  subscription: Subscription | null;
  access: Access;
  locations: Location[];
  /** Sucursal donde está operando ahora */
  location: Location | null;
  /** Todos los negocios del usuario (para cambiar de negocio) */
  businesses: { id: string; name: string; role: Role }[];
}

// ─── Permisos ────────────────────────────────────────────────────────
const PERMISSIONS = {
  stamp: ["owner", "manager", "cashier"],
  "customers.view": ["owner", "manager", "cashier"],
  "program.edit": ["owner", "manager"],
  "team.manage": ["owner", "manager"],
  reports: ["owner", "manager"],
  billing: ["owner"],
  settings: ["owner"],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export function can(ctx: Pick<StaffContext, "membership">, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(ctx.membership.role);
}

// ─── Sesión ──────────────────────────────────────────────────────────
/** Usuario de la sesión (una vez por petición). */
export const getUser = cache(async () => {
  const sb = await dbAsUser();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
});

type MembershipRow = Membership & { businesses: { id: string; name: string; status: string } | null };

/** Contexto del staff: negocio activo, programa, plan y sucursal. Una vez por petición. */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const user = await getUser();
  if (!user) return null;

  const sb = await dbAsUser();
  const { data: rows } = await sb
    .from("memberships")
    .select("*, businesses(id, name, status)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at");

  const memberships = ((rows ?? []) as MembershipRow[]).filter((m) => m.businesses?.status === "active");
  if (!memberships.length) return null;

  const store = await cookies();
  const wanted = store.get(COOKIE_BUSINESS)?.value;
  const membership = memberships.find((m) => m.business_id === wanted) ?? memberships[0];

  const [{ data: business }, { data: program }, { data: locations }, { data: subscription }] = await Promise.all([
    sb.from("businesses").select("*").eq("id", membership.business_id).single<Business>(),
    sb.from("programs").select("*").eq("business_id", membership.business_id).eq("active", true).maybeSingle<Program>(),
    sb.from("locations").select("*").eq("business_id", membership.business_id).eq("active", true).order("created_at"),
    // Los cajeros no pueden leer la suscripción por RLS; el servidor la lee para saber si se puede operar.
    db().from("subscriptions").select("*").eq("business_id", membership.business_id).maybeSingle<Subscription>(),
  ]);
  if (!business || !program) return null;

  const locs = (locations ?? []) as Location[];
  const wantedLoc = store.get(COOKIE_LOCATION)?.value;
  const location =
    (membership.location_id && locs.find((l) => l.id === membership.location_id)) ||
    locs.find((l) => l.id === wantedLoc) ||
    locs[0] ||
    null;

  const { businesses: _omit, ...plainMembership } = membership;
  return {
    user: { id: user.id, email: user.email ?? null },
    membership: plainMembership,
    business,
    program,
    subscription: subscription ?? null,
    access: accessFor(subscription ?? null),
    locations: locs,
    location,
    businesses: memberships.map((m) => ({ id: m.business_id, name: m.businesses?.name ?? "Negocio", role: m.role })),
  };
});

/** Para acciones y rutas: lanza AppError si no hay sesión o permiso. */
export async function requireStaff(permission: Permission = "stamp"): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) throw new AppError("unauthorized");
  if (!can(ctx, permission)) throw new AppError("forbidden");
  return ctx;
}

/** Para páginas: redirige si no hay sesión o permiso. */
export async function requireStaffPage(permission: Permission = "stamp"): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) {
    const user = await getUser();
    redirect(user ? "/registro?paso=negocio" : "/login");
  }
  if (!can(ctx, permission)) redirect("/panel");
  return ctx;
}

/** Bloquea operaciones si la prueba o el plan terminó. */
export function assertCanOperate(ctx: StaffContext) {
  if (!ctx.access.canOperate) throw new AppError("plan_inactive");
}
