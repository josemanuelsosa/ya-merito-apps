/**
 * Arte en SVG puro (sin texto: se ve igual en cualquier servidor sin fuentes).
 *  - stampStripSvg: la franja de sellos de Apple, el "hero" de Google y la web.
 *  - brandMarkSvg: la marca de Ya Merito (¡! con el punto naranja que ya merito cae).
 */
import type { StampIcon } from "./catalog";

// Íconos en caja de 24×24, dibujados con trazo
export const STAMP_ICON_PATHS: Record<StampIcon, string> = {
  check: "M5.5 12.5l4.2 4.2L18.5 7.8",
  star: "M12 3.8l2.5 5.1 5.6.8-4.05 3.95.96 5.6L12 16.6l-5.01 2.65.96-5.6L3.9 9.7l5.6-.8z",
  heart: "M12 19.5s-7-4.35-7-9.4A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.5c0 5.05-7 9.4-7 9.4z",
  cup: "M5 9h11v5.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5zM16 10.5h1.6a2.4 2.4 0 0 1 0 4.8H16M8 4.5v2M11 4v2.5M14 4.5v2",
  scissors: "M6 3.5a2.75 2.75 0 1 0 0 5.5a2.75 2.75 0 1 0 0-5.5zM6 15a2.75 2.75 0 1 0 0 5.5a2.75 2.75 0 1 0 0-5.5zM8.2 8.2L12 12M19.5 4.5L8.2 15.8M14.4 14.4l5.1 5.1",
  taco: "M3.5 10a8.5 8.5 0 0 0 17 0zM4.75 9.6q1.2-2.4 2.42 0t2.42 0t2.42 0t2.42 0t2.42 0t2.42 0",
};

const GIFT =
  "M4.5 10.5h15v3h-15zM6 13.5h12v6.5H6zM12 10.5V20M12 10.5c-1.2-2.8-4.8-3.6-4.8-1.4 0 1.4 2.4 1.4 4.8 1.4zM12 10.5c1.2-2.8 4.8-3.6 4.8-1.4 0 1.4-2.4 1.4-4.8 1.4z";

export interface StripOptions {
  width: number;
  height: number;
  stamps: number;
  required: number;
  backgroundColor: string;
  foregroundColor: string;
  accentColor: string;
  icon: StampIcon;
}

export function stripLayout(required: number) {
  const rows = required <= 6 ? 1 : 2;
  return { rows, cols: Math.ceil(required / rows) };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function stampStripSvg(o: StripOptions): string {
  const { width: W, height: H } = o;
  const { rows, cols } = stripLayout(o.required);
  const padX = W * 0.06;
  const padY = H * 0.14;
  const gapRatio = 0.28;
  const d = Math.min(
    (W - 2 * padX) / (cols + (cols - 1) * gapRatio),
    (H - 2 * padY) / (rows + (rows - 1) * gapRatio),
  );
  const gap = d * gapRatio;
  const x0 = (W - (cols * d + (cols - 1) * gap)) / 2;
  const y0 = (H - (rows * d + (rows - 1) * gap)) / 2;
  const r = d / 2;
  const sw = Math.max(d * 0.06, 1.5);
  const scale = (d * 0.62) / 24;
  const complete = o.stamps >= o.required;

  const cells: string[] = [];
  for (let i = 0; i < o.required; i++) {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? o.required - cols * (rows - 1) : cols;
    const offset = ((cols - inRow) * (d + gap)) / 2;
    const cx = r2(x0 + offset + (i % cols) * (d + gap) + r);
    const cy = r2(y0 + row * (d + gap) + r);
    const isReward = i === o.required - 1;
    const path = isReward ? GIFT : STAMP_ICON_PATHS[o.icon];
    const t = `translate(${r2(cx - 12 * scale)} ${r2(cy - 12 * scale)}) scale(${r2(scale)})`;

    if (i < o.stamps) {
      cells.push(
        `<circle cx="${cx}" cy="${cy}" r="${r2(r)}" fill="${o.accentColor}"/>` +
          `<path d="${path}" transform="${t}" fill="none" stroke="${o.backgroundColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    } else {
      const dash = isReward ? "" : ` stroke-dasharray="${r2(d * 0.09)} ${r2(d * 0.07)}"`;
      cells.push(
        `<circle cx="${cx}" cy="${cy}" r="${r2(r - sw / 2)}" fill="${o.foregroundColor}" fill-opacity="0.06" stroke="${o.foregroundColor}" stroke-opacity="${isReward ? 0.7 : 0.35}" stroke-width="${r2(sw)}"${dash}/>` +
          (isReward
            ? `<path d="${GIFT}" transform="${t}" fill="none" stroke="${o.accentColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
            : ""),
      );
    }
  }

  const glowDefs = complete
    ? `<radialGradient id="g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="${o.accentColor}" stop-opacity="0.35"/><stop offset="1" stop-color="${o.accentColor}" stop-opacity="0"/></radialGradient>`
    : "";
  const glow = complete ? `<rect width="${W}" height="${H}" fill="url(#g)"/>` : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>${glowDefs}</defs><rect width="${W}" height="${H}" fill="${o.backgroundColor}"/>${glow}${cells.join("")}</svg>`
  );
}

// ─── Marca ────────────────────────────────────────────────────────────
// ¡! de "¡ya merito!": el punto naranja de ! es el sello que ya merito cae.
// Los contornos viven en brand-art.ts (generados desde Bricolage Grotesque).
import { markInner } from "./brand-art";

export interface MarkOptions {
  size: number;
  ink: string;
  accent: string;
  /** Fondo redondeado (ícono de app) */
  background?: string;
  /** Rayitas de impacto junto al punto (solo en tamaños grandes) */
  motion?: boolean;
}

/** Contenido de la marca dentro de una caja 0 0 122 122. */
export function brandMarkInner({ ink, accent, motion = false }: Omit<MarkOptions, "size" | "background">): string {
  return markInner({ ink, accent, motion });
}

export function brandMarkSvg({ size, ink, accent, background, motion }: MarkOptions): string {
  if (!background) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 122 122">${brandMarkInner({ ink, accent, motion })}</svg>`;
  }
  // Ícono de app: fondo redondeado y la marca centrada
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 160 160">` +
    `<rect width="160" height="160" rx="36" fill="${background}"/>` +
    `<g transform="translate(19 19)">${brandMarkInner({ ink, accent, motion })}</g></svg>`
  );
}
