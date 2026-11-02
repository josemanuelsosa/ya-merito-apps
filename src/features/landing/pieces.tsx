// Piezas visuales del sitio: el pase de Wallet, el celular, la notificación
// y los sellos de goma. Son HTML y CSS (landing.css); el motor de
// movimiento (motion.ts) solo cambia clases y variables CSS.
import type { CSSProperties, ReactNode } from "react";
import { cardStatus } from "@/core/loyalty";
import { WORDMARK } from "@/core/brand-art";
import { brandMarkInner, STAMP_ICON_PATHS } from "@/core/stamp-art";
import type { DemoCard } from "./data";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export function Mark({ size = 28, ink = "currentColor", accent = "#FF7A12", motion = false }: { size?: number; ink?: string; accent?: string; motion?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 122 122" aria-hidden="true" dangerouslySetInnerHTML={{ __html: brandMarkInner({ ink, accent, motion }) }} />;
}

/** Logotipo "¡ya merito!" en contornos; el punto de ! es el sello naranja. */
export function Wordmark({ size = 26, ink = "currentColor", accent = "#FF7A12" }: { size?: number; ink?: string; accent?: string }) {
  const h = (size * WORDMARK.height) / 1000;
  return (
    <svg className="ym-wordmark" role="img" aria-label="Ya Merito" viewBox={WORDMARK.viewBox} height={Math.round(h)} width={Math.round((h * WORDMARK.width) / WORDMARK.height)}>
      <path d={WORDMARK.ink} fill={ink} />
      <path d={WORDMARK.accent} fill={accent} className="ym-wordmark__dot" />
    </svg>
  );
}

const ICONS = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  plus: "M12 5v14M5 12h14",
  camera: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2.2h5.4L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5zM12 16.2a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z",
  shield: "M12 3.5l7 2.6v5.4c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.1zM8.8 12l2.2 2.2 4.3-4.4",
  team: "M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3.5 19.5c.5-3.2 2.7-5.2 5.5-5.2s5 2 5.5 5.2M16 11a2.7 2.7 0 1 0 0-5.4M17.2 14.4c2 .5 3.1 2.2 3.4 5.1",
  chat: "M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6z",
  share: "M12 4v11M7.5 8.5L12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13",
  bulb: "M9.5 18h5M10 21h4M12 3.5a5.8 5.8 0 0 0-3.5 10.4c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A5.8 5.8 0 0 0 12 3.5z",
  alert: "M12 4.5l8.5 15h-17zM12 10v4.2M12 17v.01",
  stamp: "M9.5 4.5h5v4.2c0 1 .6 1.9 1.6 2.3l2.4 1V15h-13v-3l2.4-1c1-.4 1.6-1.3 1.6-2.3zM5 19h14",
  gift: "M4.5 10.5h15v3h-15zM6 13.5h12v6H6zM12 10.5v9M12 10.5c-1.2-2.8-4.8-3.6-4.8-1.4 0 1.4 2.4 1.4 4.8 1.4zM12 10.5c1.2-2.8 4.8-3.6 4.8-1.4 0 1.4-2.4 1.4-4.8 1.4z",
} as const;

export function Glyph({ name, size = 20, stroke = 2 }: { name: keyof typeof ICONS; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/** QR decorativo (no se puede escanear), siempre igual en servidor y navegador. */
export function FakeQr({ size = 96, seed = 7 }: { size?: number; seed?: number }) {
  const n = 21;
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const finder = (x: number, y: number) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rand() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  const corner = (x: number, y: number) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <path d={d + corner(0, 0) + corner(n - 7, 0) + corner(0, n - 7)} fill="#111" fillRule="evenodd" />
    </svg>
  );
}

function StampIconSvg({ icon }: { icon: DemoCard["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={STAMP_ICON_PATHS[icon]} />
    </svg>
  );
}

/**
 * Réplica del pase de Wallet hecha con HTML para poder animar cada sello.
 * El motor cambia los sellos con data-pass / data-slot.
 */
export function Pass({
  card,
  stamps = card.stamps,
  qr = false,
  className = "",
  attrs,
}: {
  card: DemoCard;
  stamps?: number;
  qr?: boolean;
  className?: string;
  attrs?: Record<string, string>;
}) {
  const s = cardStatus({ stamps, required: card.required, redemptions: 0 });
  const rows = card.required <= 6 ? 1 : 2;
  const style: Vars = { "--pbg": card.bg, "--pfg": card.fg, "--plb": card.label, "--cols": Math.ceil(card.required / rows) };
  return (
    <div className={`ym-pass ${s.complete ? "is-complete" : ""} ${className}`} style={style} data-pass="" data-required={card.required} data-stamps={stamps} {...attrs}>
      <div className="ym-pass__head">
        <span className="ym-pass__logo" aria-hidden="true">
          {(card.business.split(" ").pop() ?? card.business).slice(0, 1)}
        </span>
        <span className="ym-pass__name">{card.business}</span>
        <span className="ym-pass__count">
          <span className="ym-pass__label">SELLOS</span>
          <span data-pass-count="">{s.counter}</span>
        </span>
      </div>
      <div className="ym-pass__strip" role="img" aria-label={`${stamps} de ${card.required} sellos`} data-pass-strip="">
        {Array.from({ length: card.required }, (_, i) => (
          <span key={i} className={`ym-slot ${i < stamps ? "on" : ""}`} data-slot={i}>
            <StampIconSvg icon={card.icon} />
          </span>
        ))}
      </div>
      <div className="ym-pass__fields">
        <div className="ym-pass__field ym-pass__field--wide">
          <span className="ym-pass__label" data-pass-title="">
            {s.complete ? "¡PREMIO LISTO!" : "TU PREMIO"}
          </span>
          <span className="ym-pass__reward">{card.reward}</span>
        </div>
        <div className="ym-pass__field">
          <span className="ym-pass__label">CLIENTE</span>
          <span>{card.customer}</span>
        </div>
        <div className="ym-pass__field ym-pass__field--end">
          <span className="ym-pass__label">TE FALTAN</span>
          <span data-pass-left="">{s.remainingLabel}</span>
        </div>
      </div>
      {qr ? (
        <div className="ym-pass__qr">
          <span>
            <FakeQr size={76} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Celular de vidrio con isla dinámica. El contenido va dentro de la pantalla. */
export function Phone({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={`ym-phone ${className}`} role={label ? "img" : undefined} aria-label={label}>
      <div className="ym-phone__screen">
        <span className="ym-phone__island" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/** Aviso de Wallet en la pantalla del celular. */
export function Notif({ title, text, className = "", attrs }: { title: string; text: string; className?: string; attrs?: Record<string, string> }) {
  return (
    <div className={`ym-notif ${className}`} {...attrs}>
      <span className="ym-notif__app" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="ym-notif__body">
        <span className="ym-notif__top">
          <b>{title}</b>
          <span>ahora</span>
        </span>
        <span className="ym-notif__text" data-notif-text="">
          {text}
        </span>
      </span>
    </div>
  );
}

/** Sello de goma redondo con texto en círculo, entintado con un filtro. */
export function RoundStamp({ text, color, size = 150, className = "", style }: { text: string; color: string; size?: number; className?: string; style?: Vars }) {
  const id = `r${text.length}${size}`;
  return (
    <svg className={`ym-rstamp ${className}`} style={{ ...style, color }} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={id} d="M100 100m-72 0a72 72 0 1 1 144 0a72 72 0 1 1-144 0" />
      </defs>
      <g filter="url(#ym-ink)" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="94" strokeWidth="6" />
        <circle cx="100" cy="100" r="58" strokeWidth="3" />
        <text fill="currentColor" stroke="none" fontSize="19" fontWeight="800" letterSpacing="3.2" className="ym-rstamp__text">
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
        <g transform="translate(66 64) scale(0.56)" dangerouslySetInnerHTML={{ __html: brandMarkInner({ ink: "currentColor", accent: "currentColor", motion: false }) }} />
      </g>
    </svg>
  );
}

/** Filtro de tinta que comparten todos los sellos de goma. Va una vez por página. */
export function InkFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <filter id="ym-ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" result="moved" />
        <feComponentTransfer in="noise" result="specks">
          <feFuncA type="discrete" tableValues="1 1 1 1 1 0.15 1 1" />
        </feComponentTransfer>
        <feComposite in="moved" in2="specks" operator="in" />
      </filter>
    </svg>
  );
}
