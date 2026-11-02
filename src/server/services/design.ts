import "server-only";
import { after } from "next/server";
import { AppError } from "@/core/errors";
import { businessSchema, programSchema } from "@/core/schemas";
import { parse } from "@/server/action";
import { can, type StaffContext } from "@/server/auth/session";
import { db } from "@/server/db";
import { runJobs } from "@/server/jobs/queue";
import { normalizeLogo } from "@/server/integrations/images";

/**
 * Tarjeta y perfil del negocio. Al guardar, un trigger encola la actualización
 * de TODOS los pases (con 5 s de espera para juntar cambios seguidos).
 */
function flushQueueSoon() {
  after(async () => {
    await new Promise((r) => setTimeout(r, 6_000));
    await runJobs({ limit: 5, budgetMs: 20_000 }).catch((e) => console.error("[cola]", e));
  });
}

export async function saveProgram(ctx: StaffContext, input: unknown) {
  if (!can(ctx, "program.edit")) throw new AppError("forbidden");
  const p = parse(programSchema, input);
  const { error } = await db()
    .from("programs")
    .update({
      name: p.name,
      reward_description: p.rewardDescription,
      stamps_required: p.stampsRequired,
      terms: p.terms,
      background_color: p.backgroundColor.toUpperCase(),
      foreground_color: p.foregroundColor.toUpperCase(),
      label_color: p.labelColor.toUpperCase(),
      stamp_icon: p.stampIcon,
      max_stamps_per_visit: p.maxStampsPerVisit,
    })
    .eq("id", ctx.program.id);
  if (error) throw new AppError("unknown");
  flushQueueSoon();
}

export async function saveBusinessProfile(ctx: StaffContext, input: unknown) {
  if (!can(ctx, "program.edit")) throw new AppError("forbidden");
  const b = parse(businessSchema, input);
  const { error } = await db()
    .from("businesses")
    .update({ name: b.name, category: b.category, phone: b.phone, address: b.address })
    .eq("id", ctx.business.id);
  if (error) throw new AppError("unknown");
  flushQueueSoon();
}

export async function uploadLogo(ctx: StaffContext, file: unknown): Promise<string> {
  if (!can(ctx, "program.edit")) throw new AppError("forbidden");
  if (!(file instanceof File) || file.size === 0) throw new AppError("invalid_input", "Selecciona una imagen.");
  if (file.size > 3 * 1024 * 1024) throw new AppError("invalid_input", "La imagen pesa más de 3 MB. Usa una más ligera.");

  let png: Buffer;
  try {
    png = await normalizeLogo(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new AppError("invalid_input", "No pudimos leer esa imagen. Usa PNG o JPG.");
  }

  const path = `${ctx.business.id}/logo-${Date.now()}.png`;
  const { error } = await db().storage.from("logos").upload(path, png, { contentType: "image/png", upsert: false });
  if (error) throw new AppError("unknown", "No se pudo subir el logo. Intenta de nuevo.");

  const { data } = db().storage.from("logos").getPublicUrl(path);
  await db().from("businesses").update({ logo_url: data.publicUrl }).eq("id", ctx.business.id);
  flushQueueSoon();
  return data.publicUrl;
}
