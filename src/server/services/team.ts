import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AppError, fromDbError } from "@/core/errors";
import { roleLabel, type Role } from "@/core/catalog";
import { planFor, withinLimit } from "@/core/plans";
import { acceptInvitationSchema, inviteSchema, locationSchema, memberUpdateSchema } from "@/core/schemas";
import { parse } from "@/server/action";
import { can, getUser, type StaffContext } from "@/server/auth/session";
import { db, dbAsUser } from "@/server/db";
import { appUrl } from "@/server/env";
import { setActiveBusiness } from "@/server/services/account";
import type { Invitation, Location, Membership } from "@/server/types";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface TeamMember extends Membership {
  email: string | null;
  isYou: boolean;
}

export interface TeamView {
  members: TeamMember[];
  invitations: Invitation[];
  locations: Location[];
  seatsUsed: number;
}

export async function getTeam(ctx: StaffContext): Promise<TeamView> {
  if (!can(ctx, "team.manage")) throw new AppError("forbidden");
  const sb = await dbAsUser();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    sb.from("memberships").select("*").eq("business_id", ctx.business.id).order("created_at"),
    sb
      .from("invitations")
      .select("*")
      .eq("business_id", ctx.business.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const rows = (members ?? []) as Membership[];
  // Los correos viven en Auth; los equipos son chicos, así que se piden uno por uno
  const emails = await Promise.all(
    rows.map(async (m) => (await db().auth.admin.getUserById(m.user_id)).data.user?.email ?? null),
  );
  const pending = (invitations ?? []) as Invitation[];
  return {
    members: rows.map((m, i) => ({ ...m, email: emails[i], isYou: m.user_id === ctx.user.id })),
    invitations: pending,
    locations: ctx.locations,
    seatsUsed: rows.filter((m) => m.active).length + pending.length,
  };
}

/** Crea una invitación y devuelve el enlace para mandarlo por WhatsApp o copiarlo. */
export async function createInvitation(ctx: StaffContext, input: unknown): Promise<{ url: string; message: string }> {
  if (!can(ctx, "team.manage")) throw new AppError("forbidden");
  const data = parse(inviteSchema, input);
  if (ctx.membership.role === "manager" && data.role !== "cashier") throw new AppError("forbidden", "Un gerente solo puede invitar cajeros.");
  if (data.locationId && !ctx.locations.some((l) => l.id === data.locationId)) throw new AppError("invalid_input", "Sucursal inválida.");

  const { seatsUsed } = await getTeam(ctx);
  if (!withinLimit(ctx.access.plan, "staff", seatsUsed)) {
    const next = planFor("staff", seatsUsed + 1);
    throw new AppError("limit_reached", `Tu plan permite ${ctx.access.plan.limits.staff} usuarios.${next ? " Sube de plan para invitar a más." : ""}`);
  }

  const token = randomBytes(24).toString("base64url");
  const { error } = await db().from("invitations").insert({
    business_id: ctx.business.id,
    role: data.role,
    location_id: data.locationId ?? null,
    name: data.name,
    token_hash: hashToken(token),
    invited_by: ctx.membership.id,
  });
  if (error) throw new AppError("unknown");

  const url = `${appUrl()}/invitacion/${token}`;
  const message = `${data.name ? `Hola ${data.name}, ` : "Hola, "}te invito a ${ctx.business.name} en Ya Merito como ${roleLabel(data.role).toLowerCase()}. Entra aquí para crear tu acceso: ${url}`;
  return { url, message };
}

export async function revokeInvitation(ctx: StaffContext, invitationId: string) {
  if (!can(ctx, "team.manage")) throw new AppError("forbidden");
  await db().from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", invitationId).eq("business_id", ctx.business.id);
}

export async function updateMember(ctx: StaffContext, input: unknown) {
  if (!can(ctx, "team.manage")) throw new AppError("forbidden");
  const data = parse(memberUpdateSchema, input);
  const { data: target } = await db()
    .from("memberships")
    .select("*")
    .eq("id", data.membershipId)
    .eq("business_id", ctx.business.id)
    .maybeSingle<Membership>();
  if (!target) throw new AppError("not_found");

  const isOwner = ctx.membership.role === "owner";
  if (!isOwner && target.role !== "cashier") throw new AppError("forbidden", "Un gerente solo puede cambiar cajeros.");
  if (!isOwner && data.role && data.role !== "cashier") throw new AppError("forbidden");

  const losingOwner = target.role === "owner" && ((data.role && data.role !== "owner") || data.active === false);
  if (losingOwner) {
    const { count } = await db()
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("business_id", ctx.business.id)
      .eq("role", "owner")
      .eq("active", true);
    if ((count ?? 0) <= 1) throw new AppError("last_owner");
  }

  const patch: Partial<Membership> = {};
  if (data.role) patch.role = data.role as Role;
  if (data.locationId !== undefined) patch.location_id = data.locationId;
  if (data.active !== undefined) patch.active = data.active;
  const { error } = await db().from("memberships").update(patch).eq("id", target.id);
  if (error) throw new AppError("unknown");
}

// ─── Sucursales ──────────────────────────────────────────────────────
export async function saveLocation(ctx: StaffContext, input: unknown) {
  if (!can(ctx, "team.manage")) throw new AppError("forbidden");
  const data = parse(locationSchema, input);

  if (data.id) {
    const { error } = await db()
      .from("locations")
      .update({ name: data.name, address: data.address })
      .eq("id", data.id)
      .eq("business_id", ctx.business.id);
    if (error) throw new AppError("unknown");
    return;
  }

  if (!withinLimit(ctx.access.plan, "locations", ctx.locations.length)) {
    throw new AppError("limit_reached", `Tu plan incluye ${ctx.access.plan.limits.locations} sucursal${ctx.access.plan.limits.locations === 1 ? "" : "es"}. Sube de plan para agregar más.`);
  }
  const { error } = await db().from("locations").insert({ business_id: ctx.business.id, name: data.name, address: data.address });
  if (error) throw new AppError("unknown");
}

export async function archiveLocation(ctx: StaffContext, locationId: string) {
  if (!can(ctx, "team.manage")) throw new AppError("forbidden");
  if (ctx.locations.length <= 1) throw new AppError("invalid_input", "Tu negocio necesita al menos una sucursal.");
  await db().from("locations").update({ active: false }).eq("id", locationId).eq("business_id", ctx.business.id);
}

// ─── Invitaciones (lado del invitado) ────────────────────────────────
export interface InvitationView {
  businessName: string;
  role: "manager" | "cashier";
  locationName: string | null;
  name: string | null;
  status: "valid" | "used" | "expired" | "invalid";
}

export async function getInvitation(token: string): Promise<InvitationView> {
  const { data } = await db()
    .from("invitations")
    .select("*, businesses(name), locations(name)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.revoked_at) return { businessName: "", role: "cashier", locationName: null, name: null, status: "invalid" };
  const row = data as Invitation & { businesses: { name: string } | null; locations: { name: string } | null };
  const status = row.accepted_at ? "used" : new Date(row.expires_at) < new Date() ? "expired" : "valid";
  return {
    businessName: row.businesses?.name ?? "",
    role: row.role,
    locationName: row.locations?.name ?? null,
    name: row.name,
    status,
  };
}

/** Acepta la invitación: con la sesión actual o creando la cuenta en el momento. */
export async function acceptInvitation(input: unknown) {
  const data = parse(acceptInvitationSchema, input);
  let user = await getUser();

  if (!user) {
    if (!data.email || !data.password) throw new AppError("invalid_input", "Escribe tu correo y una contraseña.");
    const { data: created, error } = await db().auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created?.user) {
      if (error?.code === "email_exists" || /already|registered/i.test(error?.message ?? "")) throw new AppError("email_taken");
      throw new AppError("unknown");
    }
    const session = await dbAsUser();
    await session.auth.signInWithPassword({ email: data.email, password: data.password });
    user = created.user;
  }

  const { data: membership, error } = await db().rpc("accept_invitation", {
    p_token_hash: hashToken(data.token),
    p_user_id: user.id,
    p_name: data.name,
  });
  if (error) throw fromDbError(error.message);
  await setActiveBusiness((membership as Membership).business_id);
}
