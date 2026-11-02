// Procesa la cola de trabajos. Lo llama Vercel Cron o Supabase pg_cron cada minuto
// con "Authorization: Bearer <CRON_SECRET>".
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { runJobs } from "@/server/jobs/queue";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response("No autorizado", { status: 401 });
  const report = await runJobs({ limit: 200, budgetMs: 40_000 });
  // Limpieza ligera de trabajos terminados (una vez cada ~100 corridas)
  if (Math.random() < 0.01) await db().rpc("prune_jobs", { p_keep_days: 7 });
  // Promedios por giro para el estudio de mercado. La función decide sola si
  // ya toca (máximo una vez cada 20 horas, con candado para no correr doble).
  const { data: refreshed } = await db().rpc("refresh_benchmarks_if_stale");
  return Response.json({ ...report, benchmarksRefreshed: refreshed === true });
}
