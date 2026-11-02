import { brandMarkInner } from "@/core/stamp-art";
import { WORDMARK } from "@/core/brand-art";

/** La marca ¡!: el punto naranja de ! es el sello que ya merito cae. */
export function BrandMark({
  size = 28,
  ink = "currentColor",
  accent = "#FF7A12",
  motion = size >= 96,
  className,
}: {
  size?: number;
  ink?: string;
  accent?: string;
  motion?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 122 122"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: brandMarkInner({ ink, accent, motion }) }}
    />
  );
}

/**
 * Logotipo "¡ya merito!" en contornos (no depende de que cargue la fuente).
 * `size` equivale al tamaño de letra: el alto total incluye la cola de la y.
 */
export function Wordmark({ size = 24, className = "", ink = "currentColor", accent = "#FF7A12" }: { size?: number; className?: string; ink?: string; accent?: string }) {
  const height = (size * WORDMARK.height) / 1000;
  return (
    <svg
      role="img"
      aria-label="Ya Merito"
      viewBox={WORDMARK.viewBox}
      height={Math.round(height)}
      width={Math.round((height * WORDMARK.width) / WORDMARK.height)}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: `${-(WORDMARK.descent / 1000).toFixed(3)}em` }}
    >
      <path d={WORDMARK.ink} fill={ink} />
      <path d={WORDMARK.accent} fill={accent} />
    </svg>
  );
}
