import "server-only";
import { db } from "@/server/db";
import type { Business, Card, CardBundle, Customer, Program } from "@/server/types";

const SERIAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extrae el serial (uuid) de lo que lea el escáner: el serial solo o una URL /c/<serial>. */
export function serialFromCode(code: string): string | null {
  const m = code.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0].toLowerCase() : null;
}

/**
 * Tarjeta + programa + negocio + cliente en UNA consulta.
 * Usa el cliente de servicio: solo para rutas que ya validaron al que pide
 * (token de Apple, staff del mismo negocio, página pública con el serial).
 */
export async function getCardBundle(serial: string): Promise<CardBundle | null> {
  if (!SERIAL.test(serial)) return null;
  const { data } = await db()
    .from("cards")
    .select("*, programs(*), businesses(*), customers(*)")
    .eq("serial_number", serial.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  const { programs, businesses, customers, ...card } = data as Card & {
    programs: Program | null;
    businesses: Business | null;
    customers: Customer | null;
  };
  if (!programs || !businesses || !customers) return null;
  return { card, program: programs, business: businesses, customer: customers };
}

/** Versión de lo que se ve en el pase: cambia si cambian sellos, diseño o negocio. */
export function cardVersion(b: CardBundle): number {
  return Math.max(
    new Date(b.card.updated_at).getTime(),
    new Date(b.program.updated_at).getTime(),
    new Date(b.business.updated_at).getTime(),
  );
}

/** Versión del diseño del programa (para cachear imágenes compartidas). */
export function designVersion(program: Program, business: Business): number {
  return Math.max(new Date(program.updated_at).getTime(), new Date(business.updated_at).getTime());
}

/** ¿Algún iPhone tiene este pase guardado? */
export async function isInAppleWallet(serial: string): Promise<boolean> {
  const { count } = await db()
    .from("apple_registrations")
    .select("*", { count: "exact", head: true })
    .eq("serial_number", serial);
  return Boolean(count);
}
