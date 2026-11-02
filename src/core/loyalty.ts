/**
 * Reglas de la tarjeta de sellos. Código puro: sin base de datos ni red.
 * Lo usan el pase de Apple, el de Google, el panel y la página del cliente,
 * así que todos dicen exactamente lo mismo.
 */

export interface CardState {
  stamps: number;
  required: number;
  redemptions: number;
}

export interface CardStatus {
  remaining: number;
  complete: boolean;
  /** "3/8" */
  counter: string;
  /** Frase principal para el cliente */
  headline: string;
  /** Texto corto para "Te faltan" */
  remainingLabel: string;
  /** 0..1 */
  progress: number;
}

export function cardStatus({ stamps, required, redemptions }: CardState): CardStatus {
  const safeRequired = Math.max(required, 1);
  const remaining = Math.max(safeRequired - stamps, 0);
  const complete = remaining === 0;

  let headline: string;
  if (complete) headline = "¡Premio listo! Muéstralo en caja";
  else if (remaining === 1) headline = "¡Ya merito! Te falta 1 sello";
  else if (stamps === 0 && redemptions > 0) headline = "Tarjeta nueva, ¡a juntar otra vez!";
  else if (stamps === 0) headline = "Junta tu primer sello";
  else headline = `Te faltan ${remaining} sellos`;

  return {
    remaining,
    complete,
    counter: `${stamps}/${safeRequired}`,
    headline,
    remainingLabel: complete ? "¡Ya es tuyo!" : remaining === 1 ? "1 sello" : `${remaining} sellos`,
    progress: Math.min(stamps / safeRequired, 1),
  };
}

/**
 * Mensaje de la notificación de Apple Wallet (changeMessage).
 * Apple lo evalúa sobre el pase NUEVO y sustituye %@ por el valor del campo.
 */
export function appleChangeMessage(state: CardState): string {
  const s = cardStatus(state);
  if (s.complete) return "🎉 ¡Completaste tu tarjeta! Tu premio está listo (%@)";
  if (state.stamps === 0 && state.redemptions > 0) return "¡Disfruta tu premio! Tu tarjeta empieza de nuevo: %@";
  if (s.remaining === 1) return "¡Ya merito! Llevas %@, te falta 1 sello";
  return "Nuevo sello ✓ Llevas %@";
}

/** Texto de la notificación en caja después de sellar. */
export function stampFeedback(state: CardState, walletSaved: boolean): string {
  const s = cardStatus(state);
  if (s.complete) return "¡Tarjeta completa! Ya puede canjear su premio.";
  const tail = walletSaved ? "Su wallet se actualiza en segundos." : "Aún no guarda la tarjeta en su wallet.";
  return `Sello agregado. ${tail}`;
}

/** Cuántos sellos se pueden dar en esta visita sin pasarse. */
export function maxStampsNow(state: CardState, maxPerVisit: number): number {
  return Math.max(0, Math.min(maxPerVisit, state.required - state.stamps));
}
