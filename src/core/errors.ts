/**
 * Errores con código estable. Los servicios lanzan AppError; las acciones y
 * rutas los traducen a respuestas. Los mensajes están escritos para la persona
 * que usa la pantalla, no para el programador.
 */

export const ERRORS = {
  unauthorized: { status: 401, message: "Inicia sesión para continuar." },
  forbidden: { status: 403, message: "Tu usuario no tiene permiso para hacer esto." },
  not_found: { status: 404, message: "No encontramos lo que buscas." },
  invalid_input: { status: 400, message: "Revisa los datos e intenta de nuevo." },
  rate_limited: { status: 429, message: "Demasiados intentos. Espera un minuto e intenta de nuevo." },
  // Operación
  plan_inactive: { status: 402, message: "Tu prueba o plan terminó. Activa tu plan para seguir sellando." },
  limit_reached: { status: 402, message: "Llegaste al límite de tu plan. Sube de plan para agregar más." },
  feature_locked: { status: 402, message: "Esta función es parte de un plan superior." },
  // Tarjetas (vienen de las funciones SQL)
  card_not_found: { status: 404, message: "No encontramos esa tarjeta en tu negocio." },
  card_full: { status: 409, message: "La tarjeta ya está completa. Canjea el premio primero." },
  too_soon: { status: 409, message: "Esta tarjeta se acaba de sellar." },
  not_enough_stamps: { status: 409, message: "Aún no completa los sellos para el premio." },
  nothing_to_undo: { status: 409, message: "No hay un sello reciente que deshacer." },
  invalid_quantity: { status: 400, message: "Cantidad de sellos no permitida." },
  program_not_found: { status: 404, message: "Este negocio aún no tiene tarjeta activa." },
  business_not_found: { status: 404, message: "Este negocio no existe o está pausado." },
  // Cuenta y equipo
  email_taken: { status: 409, message: "Ese correo ya tiene cuenta. Inicia sesión." },
  bad_credentials: { status: 401, message: "Correo o contraseña incorrectos." },
  invitation_invalid: { status: 404, message: "Esta invitación no es válida. Pide una nueva." },
  invitation_used: { status: 409, message: "Esta invitación ya se usó." },
  invitation_expired: { status: 410, message: "Esta invitación ya venció. Pide una nueva." },
  last_owner: { status: 409, message: "El negocio necesita al menos un dueño activo." },
  // Cobro
  billing_unavailable: { status: 503, message: "El cobro en línea no está configurado todavía." },
  unknown: { status: 500, message: "Algo salió mal. Intenta de nuevo." },
} as const;

export type ErrorCode = keyof typeof ERRORS;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message?: string, fields?: Record<string, string>) {
    super(message ?? ERRORS[code].message);
    this.code = code;
    this.status = ERRORS[code].status;
    this.fields = fields;
  }
}

/** Convierte un error de Postgres (raise exception 'card_full') en AppError. */
export function fromDbError(message: string | undefined | null): AppError {
  const code = (Object.keys(ERRORS) as ErrorCode[]).find((k) => message?.includes(k));
  return new AppError(code ?? "unknown");
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError("unknown");
}
