// Contenido del sitio público. Todo lo que dice la página vive aquí para
// poder cambiar textos sin tocar el diseño.
import type { StampIcon } from "@/core/catalog";

export interface DemoCard {
  business: string;
  category: string;
  reward: string;
  required: number;
  stamps: number;
  bg: string;
  fg: string;
  label: string;
  icon: StampIcon;
  customer: string;
}

export const HERO_CARD: DemoCard = {
  business: "Café La Esquina",
  category: "Cafetería",
  reward: "Un americano gratis",
  required: 8,
  stamps: 6,
  bg: "#17152B",
  fg: "#FFFFFF",
  label: "#FF8A1F",
  icon: "cup",
  customer: "Ana López",
};

/** Negocios de ejemplo para la galería. Nombres inventados. */
export const GALLERY: DemoCard[] = [
  HERO_CARD,
  { business: "Tacos El Güero", category: "Taquería", reward: "5 tacos al pastor", required: 10, stamps: 7, bg: "#FF8A1F", fg: "#17152B", label: "#17152B", icon: "taco", customer: "Luis Pérez" },
  { business: "Barbería Don Chuy", category: "Barbería", reward: "Un corte gratis", required: 6, stamps: 4, bg: "#141414", fg: "#FFFFFF", label: "#9BE7C4", icon: "scissors", customer: "Jorge Ruiz" },
  { business: "Panadería La Espiga", category: "Panadería", reward: "Una concha y un café", required: 10, stamps: 9, bg: "#FFF3E0", fg: "#2A1B10", label: "#E2571C", icon: "star", customer: "Mariana Gil" },
  { business: "Estética Lupita", category: "Estética", reward: "Manicure gratis", required: 6, stamps: 2, bg: "#C2185B", fg: "#FFFFFF", label: "#FFE0EC", icon: "heart", customer: "Sofía Rivas" },
  { business: "Jugos Doña Mary", category: "Juguería", reward: "Un jugo verde gratis", required: 8, stamps: 5, bg: "#0F5A43", fg: "#FFFFFF", label: "#F7D774", icon: "check", customer: "Diego Mora" },
];

export const TAPE_WORDS = ["Cafeterías", "Taquerías", "Barberías", "Panaderías", "Estéticas", "Juguerías", "Neverías", "Restaurantes", "Tiendas"];

export const STORY_STEPS = [
  {
    title: "Escanea tu cartel",
    body: "Tu cliente apunta la cámara al QR de tu mostrador y pone su nombre y su celular. No descarga ninguna app.",
  },
  {
    title: "Guarda su tarjeta",
    body: "Con un toque queda en Apple Wallet o Google Wallet, junto a sus boletos de avión. No se pierde ni se queda en casa.",
  },
  {
    title: "Un sello por compra",
    body: "Tu cajero lo da con la cámara de su celular en dos segundos y la tarjeta cambia sola en el celular del cliente.",
  },
  {
    title: "¡Ya merito!",
    body: "Cuando le falta uno, su celular le avisa. Ese aviso es el que lo trae de regreso.",
  },
  {
    title: "Premio listo",
    body: "Canjea en caja, queda registrado con el cajero que lo entregó y su tarjeta vuelve a empezar.",
  },
];

/**
 * Partes del recorrido de la historia (0 a 1): en qué punto del scroll
 * empieza cada paso y en cuál cae cada sello. Lo leen la página y el motor.
 */
export const STORY_TIMING = {
  steps: [0, 0.14, 0.26, 0.74, 0.86],
  /** Momento en que cae el sello 1, 2, … 8 */
  stamps: [0.3, 0.37, 0.44, 0.51, 0.58, 0.65, 0.76, 0.88],
};

export const COUNTER_POINTS = [
  { title: "Sin lector especial", body: "Sirve la cámara de cualquier celular o tablet. Si el cliente no trae su celular, lo buscas por su número." },
  { title: "Sin trampas", body: "Nadie se sella solo, se bloquea el doble sello y cada movimiento lleva el nombre del cajero." },
  { title: "Para todo tu equipo", body: "Invita cajeros por WhatsApp, cada quien con su acceso. La tarjeta vale en todas tus sucursales." },
];

export const VERSUS = [
  { paper: "Se pierde en la cartera", wallet: "Vive en su celular, junto a sus boletos" },
  { paper: "Se queda en la otra bolsa", wallet: "La trae siempre, porque trae su celular" },
  { paper: "Cualquiera la sella con una pluma", wallet: "Solo tu equipo sella, y queda registrado" },
  { paper: "No le recuerda nada", wallet: "Le avisa cuando le falta un sello" },
  { paper: "No sabes quién regresa", wallet: "Sabes quién regresa, quién no y cuándo viene" },
  { paper: "Para cambiar el premio hay que reimprimir", wallet: "Cambias el diseño y se actualiza en todos" },
];

export const INSIGHT_POINTS = [
  { title: "Tus horas flojas", body: "Un mapa de visitas por día y hora para saber cuándo lanzar una promoción." },
  { title: "Quién está por dejar de venir", body: "Clientes en riesgo y perdidos, con un mensaje de WhatsApp listo para cada uno." },
  { title: "Cómo vas contra tu giro", body: "Cuántos de tus clientes regresan, comparado con otras cafeterías, taquerías o barberías." },
  { title: "Qué hacer esta semana", body: "A quién escribirle, qué horario reforzar y si tu tarjeta es demasiado larga." },
];

/** Segmentos del tablero de ejemplo */
export const SAMPLE_SEGMENTS = [
  { id: "frecuente", label: "Frecuentes", value: 86, color: "#0e8a5f" },
  { id: "ocasional", label: "Ocasionales", value: 140, color: "#7ccfaa" },
  { id: "nuevo", label: "Nuevos", value: 42, color: "#ff7a12" },
  { id: "en_riesgo", label: "En riesgo", value: 61, color: "#f6c35b" },
  { id: "perdido", label: "Perdidos", value: 38, color: "#d4d1de" },
];

export const HEAT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/**
 * Visitas de ejemplo de una cafetería (0 a 1) por día (lunes primero) y hora:
 * mañanas fuertes, repunte a la hora de la comida, martes en la tarde flojo.
 */
export function sampleHeat(): number[][] {
  return Array.from({ length: 7 }, (_, d) =>
    HEAT_HOURS.map((h) => {
      const weekend = d >= 5;
      const morning = Math.exp(-((h - (weekend ? 10.5 : 8.6)) ** 2) / (weekend ? 3.2 : 1.6));
      const lunch = 0.62 * Math.exp(-((h - 13.5) ** 2) / 1.1);
      const evening = 0.38 * Math.exp(-((h - 18) ** 2) / 1.4);
      let v = (weekend ? 0.92 : 1) * morning + lunch + evening + 0.06 * ((d * 7 + h * 3) % 5) / 4;
      if (d === 1 && h >= 16 && h <= 17) v *= 0.25;
      if (d === 4 && h >= 18) v *= 1.4;
      return Math.max(0, Math.min(1, v));
    }),
  );
}

export const FAQ = [
  {
    q: "¿Mis clientes tienen que descargar una app?",
    a: "No. La tarjeta se guarda en Apple Wallet o Google Wallet, que ya vienen en su celular. Si alguien no quiere guardarla, el cajero lo encuentra por su número.",
  },
  {
    q: "¿Qué necesito para empezar?",
    a: "Un celular o tablet con internet en el mostrador y tu cartel QR impreso. Creas tu cuenta en 5 minutos y ese mismo día das tu primer sello.",
  },
  {
    q: "¿Cómo cuadro el producto gratis con mi caja?",
    a: "Cada canje guarda quién, qué premio, cuándo y qué cajero lo entregó. En tu caja lo registras como cortesía y en el corte del día los canjes de Ya Merito coinciden con tus cortesías.",
  },
  {
    q: "¿Qué es el estudio de mercado?",
    a: "Con los sellos de tu negocio te mostramos quiénes son tus clientes frecuentes, quién está por dejar de venir, tus horas fuertes y flojas y qué hacer cada semana para vender más. Viene completo en los planes Pro y Cadena.",
  },
  {
    q: "¿Funciona sin internet?",
    a: "Para sellar se necesita internet en el celular del mostrador. El pase del cliente se ve aunque él no tenga señal.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. No hay plazo forzoso. Si cancelas, tu plan sigue activo hasta el final del periodo que ya pagaste y tus clientes conservan su tarjeta.",
  },
];
