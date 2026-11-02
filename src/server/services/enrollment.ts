import "server-only";
import { cache } from "react";
import { AppError, fromDbError } from "@/core/errors";
import { accessFor } from "@/core/plans";
import { enrollSchema } from "@/core/schemas";
import { parse } from "@/server/action";
import { db } from "@/server/db";
import type { Business, Location, Program, Subscription } from "@/server/types";

export interface PublicBusiness {
  business: Business;
  program: Program;
  location: Location | null;
  acceptingCustomers: boolean;
}

/** Datos públicos para la página de alta /u/[slug]. */
export const getPublicBusiness = cache(async (slug: string, locationId?: string | null): Promise<PublicBusiness | null> => {
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) return null;
  const { data: business } = await db().from("businesses").select("*").eq("slug", slug).eq("status", "active").maybeSingle<Business>();
  if (!business) return null;

  const [{ data: program }, { data: sub }, { data: location }] = await Promise.all([
    db().from("programs").select("*").eq("business_id", business.id).eq("active", true).maybeSingle<Program>(),
    db().from("subscriptions").select("*").eq("business_id", business.id).maybeSingle<Subscription>(),
    locationId && /^[0-9a-f-]{36}$/i.test(locationId)
      ? db().from("locations").select("*").eq("id", locationId).eq("business_id", business.id).eq("active", true).maybeSingle<Location>()
      : Promise.resolve({ data: null as Location | null }),
  ]);
  if (!program) return null;
  return { business, program, location: location ?? null, acceptingCustomers: accessFor(sub ?? null).canOperate };
});

/**
 * Alta pública del cliente. Protecciones:
 *  - campo trampa para bots
 *  - límite por IP (20 altas cada 10 minutos)
 *  - el negocio debe tener su plan vigente
 * Idempotente: el mismo celular recupera su misma tarjeta.
 */
export async function enrollCustomer(input: unknown, ip: string): Promise<{ serial: string; created: boolean } | null> {
  const data = parse(enrollSchema, input);

  const { data: allowed } = await db().rpc("rate_limit_hit", { p_key: `join:${ip}`, p_window_seconds: 600, p_max: 20 });
  if (allowed === false) throw new AppError("rate_limited");

  const pub = await getPublicBusiness(data.slug, data.location);
  if (!pub) throw new AppError("business_not_found");
  if (!pub.acceptingCustomers) throw new AppError("plan_inactive", "Este negocio pausó su tarjeta digital por ahora. Pregunta en caja.");

  const { data: result, error } = await db().rpc("enroll_customer", {
    p_business_id: pub.business.id,
    p_name: data.name,
    p_phone: data.phone,
    p_location_id: pub.location?.id ?? null,
  });
  if (error) throw fromDbError(error.message);
  return result as { serial: string; created: boolean };
}
