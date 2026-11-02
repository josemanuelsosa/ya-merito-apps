"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, run, type ActionResult } from "@/server/action";
import { requireStaff } from "@/server/auth/session";
import * as billing from "@/server/services/billing";
import * as design from "@/server/services/design";
import * as team from "@/server/services/team";
import type { ProgramInput } from "@/core/schemas";

// ─── Tarjeta ─────────────────────────────────────────────────────────
export async function saveProgramAction(input: ProgramInput): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await design.saveProgram(await requireStaff("program.edit"), input);
    return null;
  });
  if (r.ok) revalidatePath("/panel", "layout");
  return r;
}

export async function saveBusinessAction(_prev: ActionResult<null> | null, form: FormData): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await design.saveBusinessProfile(await requireStaff("program.edit"), formToObject(form));
    return null;
  });
  if (r.ok) revalidatePath("/panel", "layout");
  return r;
}

export async function uploadLogoAction(form: FormData): Promise<ActionResult<string>> {
  const r = await run(async () => design.uploadLogo(await requireStaff("program.edit"), form.get("logo")));
  if (r.ok) revalidatePath("/panel", "layout");
  return r;
}

// ─── Equipo y sucursales ─────────────────────────────────────────────
export async function inviteAction(input: { role: "manager" | "cashier"; name?: string; locationId?: string | null }) {
  const r = await run(async () => team.createInvitation(await requireStaff("team.manage"), input));
  if (r.ok) revalidatePath("/panel/equipo");
  return r;
}

export async function revokeInviteAction(invitationId: string): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await team.revokeInvitation(await requireStaff("team.manage"), invitationId);
    return null;
  });
  if (r.ok) revalidatePath("/panel/equipo");
  return r;
}

export async function updateMemberAction(input: {
  membershipId: string;
  role?: "owner" | "manager" | "cashier";
  locationId?: string | null;
  active?: boolean;
}): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await team.updateMember(await requireStaff("team.manage"), input);
    return null;
  });
  if (r.ok) revalidatePath("/panel/equipo");
  return r;
}

export async function saveLocationAction(input: { id?: string; name: string; address?: string }): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await team.saveLocation(await requireStaff("team.manage"), input);
    return null;
  });
  if (r.ok) revalidatePath("/panel", "layout");
  return r;
}

export async function archiveLocationAction(locationId: string): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await team.archiveLocation(await requireStaff("team.manage"), locationId);
    return null;
  });
  if (r.ok) revalidatePath("/panel", "layout");
  return r;
}

// ─── Plan ────────────────────────────────────────────────────────────
export async function checkoutAction(input: { plan: string; cycle: string }): Promise<ActionResult<null>> {
  const r = await run(async () => billing.startCheckout(await requireStaff("billing"), input));
  if (r.ok) redirect(r.data);
  return r.ok ? { ok: true, data: null } : r;
}

export async function cancelPlanAction(): Promise<ActionResult<null>> {
  const r = await run(async () => {
    await billing.cancelSubscription(await requireStaff("billing"));
    return null;
  });
  if (r.ok) revalidatePath("/panel", "layout");
  return r;
}
