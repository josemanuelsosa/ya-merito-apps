/** Catálogos pequeños que comparten UI, validación y base de datos. */

export const CATEGORIES = [
  { id: "cafeteria", label: "Cafetería", plural: "cafeterías" },
  { id: "taqueria", label: "Taquería", plural: "taquerías" },
  { id: "restaurante", label: "Restaurante", plural: "restaurantes" },
  { id: "panaderia", label: "Panadería", plural: "panaderías" },
  { id: "barberia", label: "Barbería", plural: "barberías" },
  { id: "estetica", label: "Estética o spa", plural: "estéticas" },
  { id: "tienda", label: "Tienda", plural: "tiendas" },
  { id: "otro", label: "Otro", plural: "negocios" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export function categoryPlural(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.plural ?? "negocios";
}
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const STAMP_ICONS = [
  { id: "check", label: "Palomita" },
  { id: "star", label: "Estrella" },
  { id: "heart", label: "Corazón" },
  { id: "cup", label: "Taza" },
  { id: "scissors", label: "Tijeras" },
  { id: "taco", label: "Taco" },
] as const;
export type StampIcon = (typeof STAMP_ICONS)[number]["id"];
export const STAMP_ICON_IDS = STAMP_ICONS.map((c) => c.id) as [StampIcon, ...StampIcon[]];

export const ROLES = [
  { id: "owner", label: "Dueño", description: "Todo, incluido el plan y el equipo" },
  { id: "manager", label: "Gerente", description: "Sella, diseña la tarjeta, ve reportes e invita cajeros" },
  { id: "cashier", label: "Cajero", description: "Solo sella y canjea" },
] as const;
export type Role = (typeof ROLES)[number]["id"];

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.id === role)?.label ?? role;
}

/** Paletas listas para el editor de tarjeta (fondo, texto, acento). */
export const COLOR_PRESETS = [
  { name: "Noche", bg: "#17152B", fg: "#FFFFFF", label: "#FF8A1F" },
  { name: "Rosa mexicano", bg: "#C2185B", fg: "#FFFFFF", label: "#FFE0EC" },
  { name: "Agave", bg: "#0F5A43", fg: "#FFFFFF", label: "#F7D774" },
  { name: "Masa", bg: "#FFF3E0", fg: "#2A1B10", label: "#E2571C" },
  { name: "Café", bg: "#3B2416", fg: "#FFF3E0", label: "#F2B880" },
  { name: "Talavera", bg: "#1F3E8F", fg: "#FFFFFF", label: "#FFD166" },
  { name: "Cempasúchil", bg: "#FF8A1F", fg: "#17152B", label: "#17152B" },
  { name: "Carbón", bg: "#141414", fg: "#FFFFFF", label: "#9BE7C4" },
] as const;
