/** "Café La Esquina!" → "cafe-la-esquina" */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44)
    .replace(/-+$/g, "");
  return slug.length >= 3 ? slug : `${slug || "negocio"}-ym`.slice(0, 44);
}

/** Quita espacios dobles y recorta. */
export function cleanName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** Primer nombre para saludos: "Ana López" → "Ana" */
export function firstName(name: string): string {
  return cleanName(name).split(" ")[0] ?? name;
}

/** Iniciales para avatares: "Ana López" → "AL" */
export function initials(name: string): string {
  const parts = cleanName(name).split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });

/** "hace 5 minutos", "ayer", "hace 3 días" */
export function timeAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "nunca";
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "justo ahora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}
