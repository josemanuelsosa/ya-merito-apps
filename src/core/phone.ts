/**
 * Celulares de México: se guardan como 10 dígitos.
 * Acepta "81 1234 5678", "+52 81 1234 5678", "52 1 81 1234 5678", "(81) 1234-5678".
 */
export function normalizeMxPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("521")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  if (digits.length !== 10) return null;
  return digits;
}

/** "8112345678" → "81 1234 5678" */
export function formatMxPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

/** Para mostrar en caja sin exponer el número completo: "•• •••• 5678" */
export function maskPhone(digits: string): string {
  return `•• •••• ${digits.slice(-4)}`;
}

/** Enlace de WhatsApp para un número mexicano de 10 dígitos. */
export function whatsappLink(digits: string, text: string): string {
  return `https://wa.me/52${digits}?text=${encodeURIComponent(text)}`;
}
