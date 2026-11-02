"use server";

import { run, type ActionResult } from "@/server/action";
import { requireStaff } from "@/server/auth/session";
import { setActiveLocation } from "@/server/services/account";
import * as counter from "@/server/services/counter";
import type { CardSummary } from "@/server/services/counter";

export async function lookupAction(code: string): Promise<ActionResult<CardSummary>> {
  return run(async () => counter.lookupCard(await requireStaff("stamp"), { code }));
}

export async function stampAction(input: { serial: string; qty: number; force?: boolean; ticketRef?: string }): Promise<ActionResult<CardSummary>> {
  return run(async () => counter.stamp(await requireStaff("stamp"), input));
}

export async function redeemAction(serial: string): Promise<ActionResult<CardSummary>> {
  return run(async () => counter.redeem(await requireStaff("stamp"), { serial }));
}

export async function undoAction(serial: string): Promise<ActionResult<CardSummary>> {
  return run(async () => counter.undoLastStamp(await requireStaff("stamp"), { serial }));
}

export async function setLocationAction(locationId: string): Promise<ActionResult<null>> {
  return run(async () => {
    const ctx = await requireStaff("stamp");
    if (ctx.membership.location_id) return null; // cajero fijo a una sucursal
    if (ctx.locations.some((l) => l.id === locationId)) await setActiveLocation(locationId);
    return null;
  });
}
