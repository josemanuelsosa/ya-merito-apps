import { cardStatus } from "@/core/loyalty";
import { stampStripSvg } from "@/core/stamp-art";
import type { StampIcon } from "@/core/catalog";
import { BrandMark } from "@/ui/brand";

export interface PassDesign {
  businessName: string;
  logoUrl: string | null;
  rewardDescription: string;
  stampsRequired: number;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  stampIcon: StampIcon;
}

export function designFromRows(
  program: { reward_description: string; stamps_required: number; background_color: string; foreground_color: string; label_color: string; stamp_icon: StampIcon },
  business: { name: string; logo_url: string | null },
): PassDesign {
  return {
    businessName: business.name,
    logoUrl: business.logo_url,
    rewardDescription: program.reward_description,
    stampsRequired: program.stamps_required,
    backgroundColor: program.background_color,
    foregroundColor: program.foreground_color,
    labelColor: program.label_color,
    stampIcon: program.stamp_icon,
  };
}

/**
 * Réplica web del pase de Apple Wallet (storeCard). Las etiquetas van en
 * mayúsculas porque así se ven en Wallet.
 */
export function WalletPass({
  design,
  stamps,
  redemptions = 0,
  customerName = "Tu nombre",
  qrSvg,
  className = "",
}: {
  design: PassDesign;
  stamps: number;
  redemptions?: number;
  customerName?: string;
  qrSvg?: string;
  className?: string;
}) {
  const s = cardStatus({ stamps, required: design.stampsRequired, redemptions });
  const strip = stampStripSvg({
    width: 750,
    height: 246,
    stamps,
    required: design.stampsRequired,
    backgroundColor: design.backgroundColor,
    foregroundColor: design.foregroundColor,
    accentColor: design.labelColor,
    icon: design.stampIcon,
  });
  const label = { color: design.labelColor };

  return (
    <div
      className={`w-full max-w-[360px] overflow-hidden rounded-[var(--radius-pass)] shadow-[var(--shadow-pass)] ${className}`}
      style={{ background: design.backgroundColor, color: design.foregroundColor }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {design.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
          ) : (
            <BrandMark size={30} ink={design.foregroundColor} accent={design.labelColor} />
          )}
          <span className="truncate text-[15px] font-semibold">{design.businessName}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold tracking-wider" style={label}>
            SELLOS
          </div>
          <div className="tabular font-display text-xl leading-none font-bold">{s.counter}</div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(strip)}`}
        alt={`${stamps} de ${design.stampsRequired} sellos`}
        className="block aspect-[750/246] w-full"
      />

      <div className="grid gap-3 px-4 pt-3 pb-4">
        <div>
          <div className="text-[10px] font-semibold tracking-wider" style={label}>
            {s.complete ? "¡PREMIO LISTO!" : "TU PREMIO"}
          </div>
          <div className="text-[17px] leading-snug font-medium">{design.rewardDescription}</div>
        </div>
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold tracking-wider" style={label}>
              CLIENTE
            </div>
            <div className="truncate text-[15px]">{customerName}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold tracking-wider" style={label}>
              TE FALTAN
            </div>
            <div className="text-[15px]">{s.remainingLabel}</div>
          </div>
        </div>
        <div className="flex justify-center pt-1">
          <div className="rounded-xl bg-white p-2.5">
            {qrSvg ? (
              <div className="h-[128px] w-[128px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            ) : (
              <SampleQr />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** QR decorativo para vistas previas (no se puede escanear). */
function SampleQr() {
  const n = 21;
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (!finder(x, y) && rand() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
  const corners = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={128} height={128} fill="#111" shapeRendering="crispEdges" role="img" aria-label="Código QR de ejemplo">
      {cells}
      {corners.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <rect width={7} height={7} />
          <rect x={1} y={1} width={5} height={5} fill="#fff" />
          <rect x={2} y={2} width={3} height={3} />
        </g>
      ))}
    </svg>
  );
}
