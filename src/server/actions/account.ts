"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formToObject, run, type ActionResult } from "@/server/action";
import { clientIp } from "@/server/http";
import * as account from "@/server/services/account";
import { enrollCustomer } from "@/server/services/enrollment";
import { acceptInvitation } from "@/server/services/team";
import { getStaffContext } from "@/server/auth/session";

type Form = ActionResult<unknown> | null;

export async function signUpAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  const result = await run(async () => {
    await account.signUpBusiness(formToObject(form));
    return null;
  });
  if (result.ok) redirect("/panel?bienvenida=1");
  return result;
}

export async function createBusinessAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  const f = formToObject(form);
  const result = await run(async () => {
    await account.createBusinessForCurrentUser({ businessName: f.businessName ?? "", category: f.category ?? "otro", ownerName: f.ownerName ?? "" });
    return null;
  });
  if (result.ok) redirect("/panel?bienvenida=1");
  return result;
}

export async function signInAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  const f = formToObject(form);
  const result = await run(async () => {
    await account.signIn(f);
    return null;
  });
  if (result.ok) {
    const next = f.next && f.next.startsWith("/") && !f.next.startsWith("//") ? f.next : "/panel";
    redirect(next);
  }
  return result;
}

export async function signOutAction() {
  await account.signOut();
  redirect("/login");
}

export async function resetPasswordAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  return run(async () => {
    await account.requestPasswordReset(formToObject(form));
    return null;
  });
}

export async function newPasswordAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  const result = await run(async () => {
    await account.setNewPassword(formToObject(form));
    return null;
  });
  if (result.ok) redirect("/panel");
  return result;
}

export async function switchBusinessAction(businessId: string) {
  const ctx = await getStaffContext();
  if (ctx?.businesses.some((b) => b.id === businessId)) await account.setActiveBusiness(businessId);
  redirect("/panel");
}

export async function acceptInviteAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  const result = await run(async () => {
    await acceptInvitation(formToObject(form));
    return null;
  });
  if (result.ok) redirect("/panel/sellar");
  return result;
}

/** Alta pública del cliente desde el QR del negocio. */
export async function joinAction(_prev: Form, form: FormData): Promise<ActionResult<null>> {
  const ip = clientIp(await headers());
  const result = await run(async () => enrollCustomer(formToObject(form), ip));
  if (result.ok) {
    if (!result.data) return { ok: true, data: null }; // bot: respuesta neutra
    redirect(`/c/${result.data.serial}?nueva=${result.data.created ? 1 : 0}`);
  }
  return result.ok ? { ok: true, data: null } : result;
}
