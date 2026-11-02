import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { db } from "@/server/db";
import { handlers } from "@/server/jobs/handlers";
import type { Job } from "@/server/types";

/**
 * Cola de trabajos sobre Postgres (tabla jobs, ver 0003).
 *  - Las funciones de sellado ENCOLAN dentro de su transacción (outbox).
 *  - kickQueue() procesa justo después de responder al cajero (rápido).
 *  - /api/jobs/run lo procesa cada minuto (reintentos y lo que quedó pendiente).
 * Varios workers pueden correr a la vez: claim_jobs usa "for update skip locked".
 */

export interface RunReport {
  claimed: number;
  done: number;
  failed: number;
}

export async function runJobs({ limit = 20, budgetMs = 20_000 } = {}): Promise<RunReport> {
  const worker = `w-${randomUUID().slice(0, 8)}`;
  const started = Date.now();
  const report: RunReport = { claimed: 0, done: 0, failed: 0 };

  while (Date.now() - started < budgetMs) {
    const { data, error } = await db().rpc("claim_jobs", { p_limit: Math.min(limit, 10), p_worker: worker });
    if (error) throw new Error(`claim_jobs: ${error.message}`);
    const jobs = (data ?? []) as Job[];
    if (!jobs.length) break;
    report.claimed += jobs.length;

    await Promise.all(
      jobs.map(async (job) => {
        const handler = handlers[job.type];
        try {
          if (!handler) throw new Error(`Tipo de trabajo desconocido: ${job.type}`);
          await handler(job.payload ?? {});
          await db().rpc("complete_job", { p_id: job.id });
          report.done++;
        } catch (e) {
          report.failed++;
          const message = e instanceof Error ? e.message : String(e);
          console.warn(`[cola] ${job.type}#${job.id} intento ${job.attempts}: ${message}`);
          await db().rpc("fail_job", { p_id: job.id, p_error: message });
        }
      }),
    );
    if (report.claimed >= limit) break;
  }
  return report;
}

/** Procesa la cola en segundo plano después de responder (no hace esperar al cajero). */
export function kickQueue(limit = 5) {
  after(async () => {
    try {
      await runJobs({ limit, budgetMs: 8_000 });
    } catch (e) {
      console.error("[cola]", e);
    }
  });
}

export async function enqueue(type: string, payload: Record<string, unknown>, dedupeKey?: string, delaySeconds = 0) {
  const { error } = await db().rpc("enqueue_job", {
    p_type: type,
    p_payload: payload,
    p_dedupe_key: dedupeKey ?? null,
    p_delay_seconds: delaySeconds,
  });
  if (error) throw new Error(`enqueue_job: ${error.message}`);
}
