import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { cardStatus } from "@/core/loyalty";
import { firstName } from "@/core/text";
import { features } from "@/server/env";
import { getCardBundle } from "@/server/repos/cards";
import { BrandMark } from "@/ui/brand";
import { WalletPass, designFromRows } from "@/ui/wallet-pass";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi tarjeta", robots: { index: false } };

export default async function CardPage({ params, searchParams }: { params: Promise<{ serial: string }>; searchParams: Promise<{ nueva?: string }> }) {
  const { serial } = await params;
  const { nueva } = await searchParams;
  const b = await getCardBundle(serial);
  if (!b) notFound();

  const ua = (await headers()).get("user-agent") ?? "";
  const android = /Android/i.test(ua);
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  const s = cardStatus({ stamps: b.card.stamps, required: b.program.stamps_required, redemptions: b.card.redemptions });
  const qr = await QRCode.toString(b.card.serial_number, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

  const appleBtn = features.apple ? (
    <a key="apple" href={`/api/wallet/apple/${serial}`} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-black text-[16px] font-semibold text-white active:scale-[0.98]">
      <WalletGlyph /> Agregar a Apple Wallet
    </a>
  ) : null;
  const googleBtn = features.google ? (
    <a key="google" href={`/api/wallet/google/${serial}`} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-black text-[16px] font-semibold text-white active:scale-[0.98]">
      <WalletGlyph /> Agregar a Google Wallet
    </a>
  ) : null;
  const buttons = android ? [googleBtn, appleBtn] : [appleBtn, googleBtn];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pt-10 pb-10">
      <div className="mb-7 text-center">
        {nueva === "1" ? (
          <>
            <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-[-0.025em]">¡Listo, {firstName(b.customer.name)}!</h1>
            <p className="mt-2 text-ink-2">Guárdala en tu celular para que se actualice sola con cada sello.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[34px] leading-tight font-extrabold tracking-[-0.025em]">{s.headline}</h1>
            <p className="mt-2 text-ink-2">
              {b.business.name}
              {nueva === "0" ? ". Ya tenías tarjeta aquí: es esta." : ""}
            </p>
          </>
        )}
      </div>

      <WalletPass design={designFromRows(b.program, b.business)} stamps={b.card.stamps} redemptions={b.card.redemptions} customerName={b.customer.name} qrSvg={qr} />

      <div className="mt-7 grid w-full max-w-[360px] gap-3">
        {buttons}
        {!features.apple && !features.google ? (
          <p className="rounded-2xl bg-mist p-4 text-center text-[15px]">Muestra este código en caja para recibir tus sellos.</p>
        ) : (
          <p className="text-center text-sm text-ink-2">
            {apple || android ? "¿Prefieres no guardarla? " : ""}Guarda esta página en tus favoritos y muéstrala en caja, o da tu número.
          </p>
        )}
      </div>

      {b.program.terms || b.business.address ? (
        <dl className="mt-10 grid w-full max-w-[360px] gap-3 border-t border-line pt-6 text-sm">
          {b.program.terms ? (
            <div>
              <dt className="font-semibold">Términos</dt>
              <dd className="text-ink-2">{b.program.terms}</dd>
            </div>
          ) : null}
          {b.business.address ? (
            <div>
              <dt className="font-semibold">Dirección</dt>
              <dd className="text-ink-2">{b.business.address}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <p className="mt-auto flex items-center gap-1.5 pt-10 text-xs text-ink-3">
        <BrandMark size={14} motion={false} />
        Tarjeta digital por Ya Merito
      </p>
    </main>
  );
}

/** Ícono genérico de cartera. Antes de lanzar, cambia estos botones por los oficiales de Apple y Google. */
function WalletGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M16 14.5h2" />
    </svg>
  );
}
