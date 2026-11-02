/**
 * Validación de entradas (formularios, acciones y API) con zod.
 * Un solo lugar para las reglas: el cliente puede reusarlas y el servidor
 * siempre las aplica.
 */
import { z } from "zod";
import { CATEGORY_IDS, STAMP_ICON_IDS } from "./catalog";
import { normalizeMxPhone } from "./phone";
import { cleanName } from "./text";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido");
const personName = z
  .string()
  .transform(cleanName)
  .pipe(z.string().min(2, "Escribe tu nombre (mínimo 2 letras).").max(60, "El nombre es muy largo."));
const mxPhone = z
  .string()
  .transform((v, ctx) => {
    const p = normalizeMxPhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Escribe un celular de 10 dígitos." });
      return z.NEVER;
    }
    return p;
  });
const email = z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido."));
const password = z.string().min(8, "La contraseña necesita al menos 8 caracteres.").max(72);
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null));
export const serialSchema = z.string().regex(/^[0-9a-f-]{36}$/i, "Tarjeta inválida").transform((s) => s.toLowerCase());

// ─── Cuenta ───────────────────────────────────────────────────────────
export const signUpSchema = z.object({
  businessName: z.string().transform(cleanName).pipe(z.string().min(2, "Escribe el nombre de tu negocio.").max(60)),
  category: z.enum(CATEGORY_IDS, { message: "Elige el giro de tu negocio." }),
  ownerName: personName,
  email,
  password,
});
export type SignUpInput = z.input<typeof signUpSchema>;

export const signInSchema = z.object({ email, password: z.string().min(1, "Escribe tu contraseña.") });
export const resetRequestSchema = z.object({ email });
export const newPasswordSchema = z.object({ password });

export const acceptInvitationSchema = z.object({
  token: z.string().min(20).max(100),
  name: personName,
  email: email.optional(),
  password: password.optional(),
});

// ─── Clientes ─────────────────────────────────────────────────────────
export const enrollSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,48}$/),
  name: personName,
  phone: mxPhone,
  location: z.uuid().optional().nullable(),
  /** campo trampa para bots: debe venir vacío */
  website: z.string().max(0).optional(),
});

// ─── Caja ─────────────────────────────────────────────────────────────
export const lookupSchema = z.object({ code: z.string().trim().min(4, "Escanea el QR o escribe el celular.").max(200) });
export const stampSchema = z.object({
  serial: serialSchema,
  qty: z.coerce.number().int().min(1).max(10).default(1),
  force: z.boolean().default(false),
  ticketRef: z.string().trim().max(40).optional(),
});
export const serialOnlySchema = z.object({ serial: serialSchema });

// ─── Tarjeta y negocio ────────────────────────────────────────────────
export const programSchema = z.object({
  name: z.string().trim().min(2).max(40).default("Tarjeta de sellos"),
  rewardDescription: z.string().trim().min(2, "Describe el premio.").max(80, "Máximo 80 caracteres."),
  stampsRequired: z.coerce.number().int().min(2).max(20),
  terms: optionalText(400),
  backgroundColor: hex,
  foregroundColor: hex,
  labelColor: hex,
  stampIcon: z.enum(STAMP_ICON_IDS),
  maxStampsPerVisit: z.coerce.number().int().min(1).max(10).default(3),
});
export type ProgramInput = z.input<typeof programSchema>;

export const businessSchema = z.object({
  name: z.string().transform(cleanName).pipe(z.string().min(2).max(60)),
  category: z.enum(CATEGORY_IDS),
  phone: optionalText(30),
  address: optionalText(160),
});

export const locationSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().transform(cleanName).pipe(z.string().min(2, "Ponle nombre a la sucursal.").max(60)),
  address: optionalText(160),
});

// ─── Equipo ───────────────────────────────────────────────────────────
export const inviteSchema = z.object({
  role: z.enum(["manager", "cashier"]),
  name: optionalText(60),
  locationId: z.uuid().optional().nullable(),
});
export const memberUpdateSchema = z.object({
  membershipId: z.uuid(),
  role: z.enum(["owner", "manager", "cashier"]).optional(),
  locationId: z.uuid().nullable().optional(),
  active: z.boolean().optional(),
});

// ─── Cobro ────────────────────────────────────────────────────────────
export const checkoutSchema = z.object({
  plan: z.enum(["esencial", "pro", "cadena"]),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

/** Primer mensaje de error de zod, para mostrarlo en pantalla. */
export function firstIssue(error: z.ZodError): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return { message: error.issues[0]?.message ?? "Revisa los datos.", fields };
}
