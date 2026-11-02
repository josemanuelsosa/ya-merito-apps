import "server-only";
import { cardStatus } from "@/core/loyalty";
import { db } from "@/server/db";
import { features } from "@/server/env";
import { getCardBundle } from "@/server/repos/cards";
import { pushToSerials } from "@/server/integrations/apple/apns";
import { syncGoogleClass, updateGoogleObject } from "@/server/integrations/google/wallet";
import type { Business, Program } from "@/server/types";

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const PAGE = 500;

/**
 * wallet.sync_card · un cliente selló, canjeó o se deshizo un sello.
 * Lo encolan las funciones SQL en la misma transacción del sello.
 */
async function syncCard(payload: Record<string, unknown>) {
  const serial = String(payload.serial ?? "");
  const b = await getCardBundle(serial);
  if (!b) return; // la tarjeta ya no existe: nada que hacer

  const tasks: Promise<unknown>[] = [];
  if (features.apple) tasks.push(pushToSerials([serial]));

  if (features.google && b.card.google_object_id) {
    // Aviso visible solo cuando el último movimiento completó la tarjeta
    const s = cardStatus({ stamps: b.card.stamps, required: b.program.stamps_required, redemptions: b.card.redemptions });
    let notify: string | undefined;
    if (s.complete) {
      const { data: last } = await db()
        .from("card_events")
        .select("kind, created_at")
        .eq("card_id", b.card.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.kind === "stamp" && Date.now() - new Date(last.created_at).getTime() < 15 * 60_000) notify = "¡Tu premio está listo! 🎉";
    }
    tasks.push(updateGoogleObject(b, notify));
  }

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length) throw new Error(failures.map((f) => String(f.reason?.message ?? f.reason)).join(" | "));
}

/**
 * wallet.sync_program · cambió el diseño, el premio o el logo.
 * Procesa de 500 en 500 y se vuelve a encolar con un cursor: funciona igual
 * con 50 que con 50,000 clientes, sin pasarse del tiempo de una función.
 */
async function syncProgram(payload: Record<string, unknown>) {
  const programId = String(payload.program_id ?? "");
  const after = typeof payload.after === "string" ? payload.after : "";

  const { data: program } = await db().from("programs").select("*, businesses(*)").eq("id", programId).maybeSingle();
  if (!program) return;
  const { businesses: business, ...prog } = program as Program & { businesses: Business };

  if (!after && features.google) await syncGoogleClass(business, prog);

  const { data } = await db()
    .from("cards")
    .select("serial_number, google_object_id")
    .eq("program_id", programId)
    .gt("serial_number", after)
    .order("serial_number")
    .limit(PAGE);
  const cards = (data ?? []) as { serial_number: string; google_object_id: string | null }[];
  if (!cards.length) return;

  if (features.apple) await pushToSerials(cards.map((c) => c.serial_number));

  if (features.google) {
    const withGoogle = cards.filter((c) => c.google_object_id);
    // 4 en paralelo para respetar los límites de la API de Google
    for (let i = 0; i < withGoogle.length; i += 4) {
      await Promise.all(
        withGoogle.slice(i, i + 4).map(async (c) => {
          const b = await getCardBundle(c.serial_number);
          if (b) await updateGoogleObject(b);
        }),
      );
    }
  }

  if (cards.length === PAGE) {
    const cursor = cards[cards.length - 1].serial_number;
    await db().rpc("enqueue_job", {
      p_type: "wallet.sync_program",
      p_payload: { program_id: programId, after: cursor },
      p_dedupe_key: `program:${programId}:${cursor}`,
      p_delay_seconds: 0,
    });
  }
}

export const handlers: Record<string, JobHandler> = {
  "wallet.sync_card": syncCard,
  "wallet.sync_program": syncProgram,
};
