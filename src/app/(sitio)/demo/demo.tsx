"use client";

import { useState } from "react";
import { Gift, Stamp, Undo2 } from "lucide-react";
import { appleChangeMessage, cardStatus } from "@/core/loyalty";
import { COLOR_PRESETS } from "@/core/catalog";
import { Button } from "@/ui/button";
import { StampDots } from "@/ui/bits";
import { WalletPass, type PassDesign } from "@/ui/wallet-pass";

const BUSINESSES: PassDesign[] = [
  { businessName: "Café La Esquina", logoUrl: null, rewardDescription: "Un café americano gratis", stampsRequired: 8, backgroundColor: COLOR_PRESETS[0].bg, foregroundColor: COLOR_PRESETS[0].fg, labelColor: COLOR_PRESETS[0].label, stampIcon: "cup" },
  { businessName: "Taquería El Güero", logoUrl: null, rewardDescription: "Orden de 5 tacos al pastor", stampsRequired: 10, backgroundColor: COLOR_PRESETS[1].bg, foregroundColor: COLOR_PRESETS[1].fg, labelColor: COLOR_PRESETS[1].label, stampIcon: "taco" },
  { businessName: "Barbería Don Chuy", logoUrl: null, rewardDescription: "Corte de cabello gratis", stampsRequired: 6, backgroundColor: COLOR_PRESETS[2].bg, foregroundColor: COLOR_PRESETS[2].fg, labelColor: COLOR_PRESETS[2].label, stampIcon: "scissors" },
  { businessName: "Panadería Lupita", logoUrl: null, rewardDescription: "Una concha y un café de olla", stampsRequired: 5, backgroundColor: COLOR_PRESETS[3].bg, foregroundColor: COLOR_PRESETS[3].fg, labelColor: COLOR_PRESETS[3].label, stampIcon: "heart" },
];

export function Demo() {
  const [index, setIndex] = useState(0);
  const design = BUSINESSES[index];
  const [stamps, setStamps] = useState(3);
  const [redemptions, setRedemptions] = useState(0);
  const [lastQty, setLastQty] = useState(0);
  const [hit, setHit] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const s = cardStatus({ stamps, required: design.stampsRequired, redemptions });

  function notify(st: number, rd: number) {
    setNote(appleChangeMessage({ stamps: st, required: design.stampsRequired, redemptions: rd }).replace("%@", `${st}/${design.stampsRequired}`));
    setHit((h) => h + 1);
  }

  function stamp(qty: number) {
    const real = Math.min(qty, design.stampsRequired - stamps);
    if (real <= 0) return;
    setStamps(stamps + real);
    setLastQty(real);
    notify(stamps + real, redemptions);
  }

  function redeem() {
    setStamps(0);
    setRedemptions(redemptions + 1);
    setLastQty(0);
    notify(0, redemptions + 1);
  }

  function undo() {
    setStamps(Math.max(0, stamps - lastQty));
    setLastQty(0);
    setNote(null);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:items-start">
      <div>
        <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Negocio de ejemplo">
          {BUSINESSES.map((b, i) => (
            <button
              key={b.businessName}
              type="button"
              role="radio"
              aria-checked={i === index}
              onClick={() => {
                setIndex(i);
                setStamps(Math.min(stamps, b.stampsRequired - 1));
                setNote(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${i === index ? "bg-ink text-paper" : "bg-mist text-ink-2 hover:text-ink"}`}
            >
              {b.businessName}
            </button>
          ))}
        </div>

        <div className="rounded-[24px] shadow-[inset_0_0_0_1.5px_var(--color-line)]">
          <div className="border-b border-line px-6 py-5">
            <p className="text-sm text-ink-2">Pase escaneado · •• •••• 5678</p>
            <p className="mt-1 font-display text-3xl font-bold">Ana López</p>
            <p className={`mt-1 font-semibold ${s.complete ? "text-agave" : "text-cempa-ink"}`}>{s.headline}</p>
          </div>
          <div className="grid gap-6 px-6 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <StampDots stamps={stamps} required={design.stampsRequired} size={22} />
              <p className="mt-3 text-sm text-ink-2">
                {stamps} de {design.stampsRequired} · Premio: <span className="font-semibold text-ink">{design.rewardDescription}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!s.complete && s.remaining >= 2 ? (
                  <Button variant="ghost" size="sm" onClick={() => stamp(2)}>
                    + 2 sellos
                  </Button>
                ) : null}
                {lastQty > 0 ? (
                  <Button variant="quiet" size="sm" onClick={undo}>
                    <Undo2 size={16} aria-hidden="true" />
                    Deshacer
                  </Button>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => (s.complete ? redeem() : stamp(1))}
              className={`relative flex h-32 w-32 flex-col items-center justify-center justify-self-center rounded-full font-display text-lg font-bold shadow-[0_14px_30px_-12px_rgb(23_21_43/0.5)] transition-transform active:scale-95 ${
                s.complete ? "bg-agave text-white" : "bg-cempa text-ink"
              }`}
            >
              <span key={hit} className="ink-ring pointer-events-none absolute inset-0 rounded-full border-4 border-cempa" aria-hidden="true" />
              {s.complete ? <Gift size={30} aria-hidden="true" /> : <Stamp size={30} aria-hidden="true" />}
              <span className="mt-1">{s.complete ? "Canjear" : "Sellar"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[360px]">
        {note ? (
          <div key={hit} role="status" className="absolute -top-6 right-2 left-2 z-10 animate-rise rounded-2xl bg-paper/95 px-4 py-3 shadow-[var(--shadow-float)] backdrop-blur">
            <span className="block text-xs text-ink-3">Wallet · {design.businessName}</span>
            <span className="block text-sm font-semibold">{note}</span>
          </div>
        ) : null}
        <WalletPass design={design} stamps={stamps} redemptions={redemptions} customerName="Ana López" />
      </div>
    </div>
  );
}
