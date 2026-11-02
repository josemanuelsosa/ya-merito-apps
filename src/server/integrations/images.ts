import "server-only";
import sharp from "sharp";
import { brandMarkSvg, stampStripSvg } from "@/core/stamp-art";
import { LRU } from "@/server/lru";
import type { Business, Program } from "@/server/types";

/**
 * Imágenes de los pases. Clave de escala: una tarjeta de 8 sellos solo tiene
 * 9 franjas posibles (0…8 sellos). Se cachean por diseño + sellos, así que
 * miles de clientes comparten las mismas imágenes.
 */
const strips = new LRU<string, Buffer>(400);
const logos = new LRU<string, Buffer | null>(100);
const derived = new LRU<string, Buffer>(300);

export function stripKey(program: Program, stamps: number, w: number, h: number) {
  return `${program.id}:${program.updated_at}:${stamps}:${w}x${h}`;
}

export async function renderStrip(program: Program, stamps: number, width: number, height: number): Promise<Buffer> {
  return strips.getOrSet(stripKey(program, stamps, width, height), () =>
    sharp(
      Buffer.from(
        stampStripSvg({
          width,
          height,
          stamps,
          required: program.stamps_required,
          backgroundColor: program.background_color,
          foregroundColor: program.foreground_color,
          accentColor: program.label_color,
          icon: program.stamp_icon,
        }),
      ),
    )
      .png()
      .toBuffer(),
  );
}

async function fetchLogo(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  return logos.getOrSet(url, async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  });
}

/** Logo del negocio o, si no subió uno, la marca de Ya Merito en sus colores. */
async function logoSource(business: Business, program: Program): Promise<Buffer> {
  return (
    (await fetchLogo(business.logo_url)) ??
    Buffer.from(brandMarkSvg({ size: 512, ink: program.foreground_color, accent: program.label_color }))
  );
}

/**
 * Archivos de imagen de un storeCard de Apple:
 *  icon (29 pt, notificaciones) · logo (máx 160×50 pt) · strip (375×123 pt)
 */
export async function appleImages(business: Business, program: Program, stamps: number): Promise<Record<string, Buffer>> {
  const bg = program.background_color;
  const designKey = `${business.id}:${business.updated_at}:${program.id}:${program.updated_at}`;
  const files: Record<string, Buffer> = {};

  for (const [suffix, k] of [["", 1], ["@2x", 2], ["@3x", 3]] as const) {
    files[`icon${suffix}.png`] = await derived.getOrSet(`icon:${designKey}:${k}`, async () =>
      sharp(await logoSource(business, program))
        .resize(29 * k, 29 * k, { fit: "contain", background: bg })
        .flatten({ background: bg })
        .png()
        .toBuffer(),
    );
    files[`logo${suffix}.png`] = await derived.getOrSet(`logo:${designKey}:${k}`, async () =>
      sharp(await logoSource(business, program)).resize(50 * k, 50 * k, { fit: "inside" }).png().toBuffer(),
    );
    files[`strip${suffix}.png`] = await renderStrip(program, stamps, 375 * k, 123 * k);
  }
  return files;
}

/** Normaliza un logo subido: PNG, máx 512 px, conserva transparencia. */
export async function normalizeLogo(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize(512, 512, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
}
