import "server-only";
import { AppError, fromDbError } from "@/core/errors";
import { cardStatus, maxStampsNow } from "@/core/loyalty";
import { maskPhone, normalizeMxPhone } from "@/core/phone";
import { lookupSchema, serialOnlySchema, stampSchema } from "@/core/schemas";
import { parse } from "@/server/action";
import { assertCanOperate, type StaffContext } from "@/server/auth/session";
import { db } from "@/server/db";
import { kickQueue } from "@/server/jobs/queue";
import { getCardBundle, isInAppleWallet, serialFromCode } from "@/server/repos/cards";
import type { CardBundle } from "@/server/types";

/**
 * Caja: buscar, sellar, canjear y deshacer.
 * Cada operación es una función SQL atómica que además encola la
 * actualización de la wallet; aquí solo validamos y respondemos rápido.
 */

export interface CardSummary {
  serial: string;
  customerId: string;
  name: string;
  phone: string;
  stamps: number;
  required: number;
  reward: string;
  complete: boolean;
  remaining: number;
  headline: string;
  redemptions: number;
  visits: number;
  lastStampAt: string | null;
  maxNow: number;
  inApple: boolean;
  inGoogle: boolean;
}

async function summarize(b: CardBundle): Promise<CardSummary> {
  const state = { stamps: b.card.stamps, required: b.program.stamps_required, redemptions: b.card.redemptions };
  const s = cardStatus(state);
  return {
    serial: b.card.serial_number,
    customerId: b.customer.id,
    name: b.customer.name,
    phone: maskPhone(b.customer.phone),
    stamps: b.card.stamps,
    required: b.program.stamps_required,
    reward: b.program.reward_description,
    complete: s.complete,
    remaining: s.remaining,
    headline: s.headline,
    redemptions: b.card.redemptions,
    visits: b.card.visits,
    lastStampAt: b.card.last_stamp_at,
    maxNow: maxStampsNow(state, b.program.max_stamps_per_visit),
    inApple: await isInAppleWallet(b.card.serial_number),
    inGoogle: Boolean(b.card.google_object_id),
  };
}

async function bundleForBusiness(ctx: StaffContext, serial: string): Promise<CardBundle> {
  const b = await getCardBundle(serial);
  if (!b || b.business.id !== ctx.business.id) throw new AppError("card_not_found");
  return b;
}

/** Busca por QR escaneado (serial o URL) o por celular. */
export async function lookupCard(ctx: StaffContext, input: unknown): Promise<CardSummary> {
  const { code } = parse(lookupSchema, input);
  let serial = serialFromCode(code);

  if (!serial) {
    const phone = normalizeMxPhone(code);
    if (!phone) throw new AppError("invalid_input", "Escanea el QR del pase o escribe el celular de 10 dígitos.");
    const { data } = await db()
      .from("cards")
      .select("serial_number, customers!inner(phone)")
      .eq("business_id", ctx.business.id)
      .eq("program_id", ctx.program.id)
      .eq("customers.phone", phone)
      .maybeSingle();
    serial = (data as { serial_number: string } | null)?.serial_number ?? null;
    if (!serial) throw new AppError("card_not_found", "Ese celular no tiene tarjeta. Pídele que escanee el QR de alta.");
  }

  return summarize(await bundleForBusiness(ctx, serial));
}

export async function stamp(ctx: StaffContext, input: unknown): Promise<CardSummary> {
  assertCanOperate(ctx);
  const data = parse(stampSchema, input);
  if (data.ticketRef && !ctx.access.plan.features.ticketRef) throw new AppError("feature_locked");

  const { error } = await db().rpc("add_stamps", {
    p_business_id: ctx.business.id,
    p_serial: data.serial,
    p_membership_id: ctx.membership.id,
    p_location_id: ctx.location?.id ?? null,
    p_qty: data.qty,
    p_force: data.force,
    p_ticket_ref: data.ticketRef ?? null,
  });
  if (error) throw fromDbError(error.message);

  kickQueue();
  return summarize(await bundleForBusiness(ctx, data.serial));
}

export async function redeem(ctx: StaffContext, input: unknown): Promise<CardSummary> {
  assertCanOperate(ctx);
  const { serial } = parse(serialOnlySchema, input);
  const { error } = await db().rpc("redeem_reward", {
    p_business_id: ctx.business.id,
    p_serial: serial,
    p_membership_id: ctx.membership.id,
    p_location_id: ctx.location?.id ?? null,
  });
  if (error) throw fromDbError(error.message);

  kickQueue();
  return summarize(await bundleForBusiness(ctx, serial));
}

export async function undoLastStamp(ctx: StaffContext, input: unknown): Promise<CardSummary> {
  const { serial } = parse(serialOnlySchema, input);
  const { error } = await db().rpc("undo_last_stamp", {
    p_business_id: ctx.business.id,
    p_serial: serial,
    p_membership_id: ctx.membership.id,
  });
  if (error) throw fromDbError(error.message);

  kickQueue();
  return summarize(await bundleForBusiness(ctx, serial));
}
