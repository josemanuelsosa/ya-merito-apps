import type { Metadata } from "next";
import QRCode from "qrcode";
import { Download, MessageCircle } from "lucide-react";
import { requireStaffPage } from "@/server/auth/session";
import { appUrl } from "@/server/env";
import { PosterActions } from "@/features/poster-actions";
import { BrandMark } from "@/ui/brand";
import { PageHeader } from "@/ui/bits";
import { ButtonLink } from "@/ui/button";

export const metadata: Metadata = { title: "Cartel QR" };

export default async function QrPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const ctx = await requireStaffPage("stamp");
  const { s } = await searchParams;
  const location = ctx.locations.find((l) => l.id === s) ?? (ctx.locations.length > 1 ? ctx.location : null);
  const url = `${appUrl()}/u/${ctx.business.slug}${location && ctx.locations.length > 1 ? `?s=${location.id}` : ""}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#17152B", light: "#FFFFFF" } });
  const p = ctx.program;
  const share = `https://wa.me/?text=${encodeURIComponent(`Saca tu tarjeta de sellos de ${ctx.business.name} y llévate ${p.reward_description}: ${url}`)}`;

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Cartel QR"
          description="Imprímelo y pégalo junto a la caja o en las mesas. Tus clientes lo escanean con la cámara para sacar su tarjeta."
          actions={<PosterActions url={url} />}
        />
        {ctx.locations.length > 1 ? (
          <nav aria-label="Sucursal del cartel" className="mb-6 flex flex-wrap gap-2">
            {ctx.locations.map((l) => (
              <a
                key={l.id}
                href={`/panel/qr?s=${l.id}`}
                aria-current={l.id === location?.id ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${l.id === location?.id ? "bg-ink text-paper" : "bg-mist text-ink-2"}`}
              >
                {l.name}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      {/* Cartel media carta */}
      <article
        className="mx-auto flex w-full max-w-[520px] flex-col items-center overflow-hidden rounded-[32px] text-center shadow-[var(--shadow-pass)] print:max-w-none print:rounded-none print:shadow-none"
        style={{ background: p.background_color, color: p.foreground_color }}
      >
        <div className="w-full px-8 pt-10 pb-7">
          {ctx.business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ctx.business.logo_url} alt="" className="mx-auto mb-4 h-16 w-16 object-contain" />
          ) : null}
          <p className="text-lg font-semibold" style={{ color: p.label_color }}>
            {ctx.business.name}
          </p>
          <h2 className="mt-3 font-display text-[42px] leading-[0.98] font-extrabold tracking-[-0.03em]">Junta {p.stamps_required} sellos y llévate</h2>
          <p className="mt-3 font-display text-2xl font-bold" style={{ color: p.label_color }}>
            {p.reward_description}
          </p>
        </div>
        <div className="rounded-[24px] bg-white p-5">
          <div className="h-56 w-56 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Código QR para sacar la tarjeta" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <ol className="grid w-full grid-cols-3 gap-3 px-6 pt-8 pb-7 text-[15px] leading-snug">
          {["Abre la cámara y escanea", "Escribe tu nombre y celular", "Guárdala en tu Wallet"].map((t, i) => (
            <li key={t} className="flex flex-col items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full font-display text-lg font-bold" style={{ background: p.label_color, color: p.background_color }}>
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
        <p className="flex w-full items-center justify-center gap-2 border-t py-4 text-sm opacity-75" style={{ borderColor: `${p.foreground_color}26` }}>
          <BrandMark size={16} ink={p.foreground_color} accent={p.label_color} motion={false} />
          Tarjeta digital por Ya Merito
        </p>
      </article>

      <div className="no-print mx-auto mt-8 grid max-w-[520px] gap-3">
        <p className="text-center text-sm text-ink-2">
          Enlace directo: <span className="break-all text-ink">{url}</span>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href={`/api/panel/qr${location && ctx.locations.length > 1 ? `?s=${location.id}` : ""}`} variant="ghost" size="sm">
            <Download size={16} aria-hidden="true" />
            Descargar QR en PNG
          </ButtonLink>
          <ButtonLink href={share} variant="ghost" size="sm" target="_blank" rel="noopener">
            <MessageCircle size={16} aria-hidden="true" />
            Compartir por WhatsApp
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
