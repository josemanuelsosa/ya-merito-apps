import "server-only";
import { cookies } from "next/headers";
import { AppError, fromDbError } from "@/core/errors";
import { TRIAL_DAYS } from "@/core/plans";
import { newPasswordSchema, resetRequestSchema, signInSchema, signUpSchema } from "@/core/schemas";
import { slugify } from "@/core/text";
import { CATEGORY_IDS, type CategoryId } from "@/core/catalog";
import { parse } from "@/server/action";
import { db, dbAsUser } from "@/server/db";
import { appUrl, COOKIE_BUSINESS, COOKIE_LOCATION } from "@/server/env";
import { getUser } from "@/server/auth/session";
import type { Business } from "@/server/types";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 };

export async function setActiveBusiness(businessId: string) {
  const store = await cookies();
  store.set(COOKIE_BUSINESS, businessId, COOKIE_OPTS);
  store.delete(COOKIE_LOCATION);
}

export async function setActiveLocation(locationId: string) {
  (await cookies()).set(COOKIE_LOCATION, locationId, COOKIE_OPTS);
}

/**
 * Registro self-serve: crea la cuenta, inicia sesión y crea el negocio con
 * su sucursal, su tarjeta sugerida según el giro y 14 días de prueba del plan Pro.
 */
export async function signUpBusiness(input: unknown): Promise<Business> {
  const data = parse(signUpSchema, input);
  const admin = db();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.ownerName },
  });
  if (error || !created?.user) {
    if (error?.code === "email_exists" || /already|registered/i.test(error?.message ?? "")) throw new AppError("email_taken");
    throw new AppError("unknown");
  }

  const session = await dbAsUser();
  await session.auth.signInWithPassword({ email: data.email, password: data.password });

  try {
    const business = await createBusinessFor(created.user.id, data.ownerName, data.businessName, data.category);
    return business;
  } catch (e) {
    // Si el negocio no se pudo crear, no dejamos una cuenta huérfana
    await admin.auth.admin.deleteUser(created.user.id);
    throw e;
  }
}

/** Para un usuario con sesión que aún no tiene negocio (p. ej. un cajero que abre el suyo). */
export async function createBusinessForCurrentUser(input: { businessName: string; category: string; ownerName: string }) {
  const user = await getUser();
  if (!user) throw new AppError("unauthorized");
  const category = (CATEGORY_IDS as readonly string[]).includes(input.category) ? (input.category as CategoryId) : "otro";
  return createBusinessFor(user.id, input.ownerName, input.businessName, category);
}

async function createBusinessFor(userId: string, ownerName: string, businessName: string, category: CategoryId) {
  const { data, error } = await db().rpc("create_business", {
    p_user_id: userId,
    p_owner_name: ownerName,
    p_name: businessName,
    p_slug: slugify(businessName),
    p_category: category,
    p_trial_days: TRIAL_DAYS,
  });
  if (error || !data) throw fromDbError(error?.message);
  const business = data as Business;
  await setActiveBusiness(business.id);
  return business;
}

export async function signIn(input: unknown) {
  const data = parse(signInSchema, input);
  const session = await dbAsUser();
  const { error } = await session.auth.signInWithPassword({ email: data.email, password: data.password });
  if (error) throw new AppError("bad_credentials");
}

export async function signOut() {
  const session = await dbAsUser();
  await session.auth.signOut();
  const store = await cookies();
  store.delete(COOKIE_BUSINESS);
  store.delete(COOKIE_LOCATION);
}

/** Manda el correo para elegir nueva contraseña (Supabase Auth). */
export async function requestPasswordReset(input: unknown) {
  const data = parse(resetRequestSchema, input);
  const session = await dbAsUser();
  // Siempre respondemos igual, exista o no el correo (no revelamos cuentas)
  await session.auth.resetPasswordForEmail(data.email, { redirectTo: `${appUrl()}/auth/callback?next=/nueva-clave` });
}

export async function setNewPassword(input: unknown) {
  const data = parse(newPasswordSchema, input);
  const session = await dbAsUser();
  const { error } = await session.auth.updateUser({ password: data.password });
  if (error) throw new AppError("unauthorized", "El enlace ya venció. Pide uno nuevo.");
}
