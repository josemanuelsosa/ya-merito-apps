import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { AppError, toAppError } from "@/core/errors";
import { firstIssue } from "@/core/schemas";

/** Lo que devuelve toda acción del servidor a la pantalla. */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; fields?: Record<string, string> };

/** Valida con zod o lanza AppError('invalid_input') con el primer mensaje. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { message, fields } = firstIssue(result.error);
    throw new AppError("invalid_input", message, fields);
  }
  return result.data;
}

/**
 * Ejecuta una acción y convierte cualquier error en un resultado legible.
 * Deja pasar redirect()/notFound() de Next.
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    const e = toAppError(error);
    if (e.code === "unknown") console.error("[accion]", error);
    return { ok: false, error: e.message, code: e.code, fields: e.fields };
  }
}

/** FormData → objeto plano (los checkbox llegan como "on"). */
export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}
