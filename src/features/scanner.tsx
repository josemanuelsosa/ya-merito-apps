"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type QrScannerType from "qr-scanner";
import { Camera, Gift, MapPin, Search, Stamp, Undo2 } from "lucide-react";
import { lookupAction, redeemAction, setLocationAction, stampAction, undoAction } from "@/server/actions/counter";
import type { CardSummary } from "@/server/services/counter";
import { Pill, StampDots } from "@/ui/bits";
import { Button } from "@/ui/button";
import { Notice } from "@/ui/form";
import { useToast } from "@/ui/toast";

type CameraState = "off" | "starting" | "on" | "denied";

/**
 * Pantalla de caja. Pensada para una mano y prisa:
 *  escanear → ver a quién → un toque al sello → siguiente.
 * Acepta también lectores de código USB/Bluetooth (escriben y dan Enter).
 */
export function Scanner({
  locations,
  locationId,
  locationName,
  askTicket,
  maxPerVisit,
}: {
  locations: { id: string; name: string }[];
  locationId: string | null;
  locationName: string | null;
  askTicket: boolean;
  maxPerVisit: number;
}) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const busyRef = useRef(false);
  const [pending, startTransition] = useTransition();

  const [card, setCard] = useState<CardSummary | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraState>("off");
  const [qty, setQty] = useState(1);
  const [ticket, setTicket] = useState("");
  const [confirmAgain, setConfirmAgain] = useState(false);
  const [undoable, setUndoable] = useState(false);
  const [hit, setHit] = useState(0);
  const lastScan = useRef({ value: "", at: 0 });

  // ─── Cámara ───────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setCamera("off");
  }, []);

  const find = useCallback(
    (value: string) => {
      if (busyRef.current || !value.trim()) return;
      busyRef.current = true;
      setError(null);
      startTransition(async () => {
        const r = await lookupAction(value.trim());
        busyRef.current = false;
        if (r.ok) {
          stopCamera();
          setCard(r.data);
          setQty(1);
          setTicket("");
          setConfirmAgain(false);
          setUndoable(false);
          setCode("");
          navigator.vibrate?.(35);
        } else {
          setError(r.error);
        }
      });
    },
    [stopCamera],
  );

  const startCamera = useCallback(async () => {
    if (!videoRef.current || scannerRef.current) return;
    setCamera("starting");
    try {
      const { default: QrScanner } = await import("qr-scanner");
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          // El mismo código se ignora 4 s (la cámara lo lee varias veces por segundo)
          const now = Date.now();
          if (result.data === lastScan.current.value && now - lastScan.current.at < 4000) return;
          lastScan.current = { value: result.data, at: now };
          find(result.data);
        },
        {
        preferredCamera: "environment",
        maxScansPerSecond: 6,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setCamera("on");
    } catch {
      scannerRef.current = null;
      setCamera("denied");
    }
  }, [find]);

  useEffect(() => {
    if (!card) startCamera();
    return () => {
      if (!card) stopCamera();
    };
  }, [card, startCamera, stopCamera]);

  // ─── Acciones ─────────────────────────────────────────────────────
  function doStamp(force = false) {
    if (!card) return;
    startTransition(async () => {
      const r = await stampAction({ serial: card.serial, qty, force, ticketRef: ticket || undefined });
      if (r.ok) {
        setCard(r.data);
        setConfirmAgain(false);
        setUndoable(true);
        setQty(1);
        setTicket("");
        setHit((h) => h + 1);
        navigator.vibrate?.([25, 40, 70]);
        toast(r.data.complete ? "¡Tarjeta completa! Ya puede canjear." : r.data.inApple || r.data.inGoogle ? "Sellado. Su wallet se actualiza en segundos." : "Sellado.");
      } else if (r.code === "too_soon") {
        setConfirmAgain(true);
      } else {
        toast(r.error, "error");
      }
    });
  }

  function doRedeem() {
    if (!card) return;
    startTransition(async () => {
      const r = await redeemAction(card.serial);
      if (r.ok) {
        setCard(r.data);
        setUndoable(false);
        setHit((h) => h + 1);
        navigator.vibrate?.([40, 60, 40]);
        toast(`Premio canjeado: ${r.data.reward}`);
      } else toast(r.error, "error");
    });
  }

  function doUndo() {
    if (!card) return;
    startTransition(async () => {
      const r = await undoAction(card.serial);
      if (r.ok) {
        setCard(r.data);
        setUndoable(false);
        toast("Se deshizo el último sello.", "info");
      } else toast(r.error, "error");
    });
  }

  function next() {
    setCard(null);
    setError(null);
    setConfirmAgain(false);
    setUndoable(false);
  }

  function changeLocation(id: string) {
    startTransition(async () => {
      await setLocationAction(id);
      toast("Sucursal cambiada.", "info");
    });
  }

  const options = Math.max(1, Math.min(maxPerVisit, card?.maxNow ?? 1, 3));

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">{card ? "Cliente" : "Sellar"}</h1>
        {locations.length > 1 ? (
          <label className="flex items-center gap-1.5 rounded-full bg-mist py-1.5 pr-2 pl-3 text-sm">
            <MapPin size={15} className="text-ink-2" aria-hidden="true" />
            <span className="sr-only">Sucursal</span>
            <select defaultValue={locationId ?? ""} onChange={(e) => changeLocation(e.target.value)} className="bg-transparent font-semibold outline-none">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        ) : locationName ? (
          <Pill>
            <MapPin size={13} aria-hidden="true" />
            {locationName}
          </Pill>
        ) : null}
      </div>

      {!card ? (
        <>
          <div className="relative aspect-square w-full overflow-hidden rounded-[28px] bg-ink">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="Cámara para escanear el pase" />
            {/* Esquinas del visor */}
            <div className="pointer-events-none absolute inset-[16%]" aria-hidden="true">
              {["top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((c) => (
                <span key={c} className={`absolute h-10 w-10 border-cempa ${c}`} />
              ))}
            </div>
            {camera !== "on" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-paper">
                {camera === "denied" ? (
                  <>
                    <Camera size={28} aria-hidden="true" className="text-paper/70" />
                    <p className="font-semibold">No pudimos usar la cámara.</p>
                    <p className="text-sm text-paper/70">Permite la cámara en tu navegador o busca al cliente por su celular aquí abajo.</p>
                    <Button variant="accent" size="sm" onClick={startCamera}>
                      Intentar de nuevo
                    </Button>
                  </>
                ) : camera === "starting" ? (
                  <p className="text-paper/70">Abriendo cámara…</p>
                ) : (
                  <Button variant="accent" onClick={startCamera}>
                    <Camera size={18} aria-hidden="true" />
                    Abrir cámara
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          <p className="text-center text-[15px] text-ink-2">Apunta al código QR del pase del cliente.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              find(code);
            }}
            className="flex gap-2"
          >
            <label htmlFor="buscar" className="sr-only">
              Celular o código del pase
            </label>
            <input
              id="buscar"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="tel"
              autoComplete="off"
              placeholder="Celular o código del pase"
              className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-paper px-4 text-[16px] outline-none focus:border-ink"
            />
            <Button type="submit" disabled={pending || !code.trim()} className="h-12 w-12 px-0" aria-label="Buscar">
              <Search size={20} aria-hidden="true" />
            </Button>
          </form>
          {error ? <Notice tone="error">{error}</Notice> : null}
        </>
      ) : (
        <div className="grid gap-6">
          <div className="border-b border-line pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/panel/clientes/${card.customerId}`} className="block truncate font-display text-[34px] leading-tight font-bold tracking-[-0.02em] hover:underline">
                  {card.name}
                </Link>
                <p className="mt-0.5 text-ink-2">
                  {card.phone} · {card.visits} visita{card.visits === 1 ? "" : "s"}
                  {card.redemptions ? ` · ${card.redemptions} premio${card.redemptions === 1 ? "" : "s"}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={card.inApple ? "ink" : "mist"}>{card.inApple ? "En Apple Wallet" : "Sin Apple Wallet"}</Pill>
              <Pill tone={card.inGoogle ? "ink" : "mist"}>{card.inGoogle ? "En Google Wallet" : "Sin Google Wallet"}</Pill>
            </div>
          </div>

          <div className="text-center">
            <p className={`font-display text-xl font-bold ${card.complete ? "text-agave" : ""}`}>{card.headline}</p>
            <div key={hit} className="mt-3 flex justify-center">
              <StampDots stamps={card.stamps} required={card.required} size={24} />
            </div>
            <p className="mt-2 text-sm text-ink-2">
              {card.stamps} de {card.required} · Premio: <span className="font-semibold text-ink">{card.reward}</span>
            </p>
          </div>

          {confirmAgain ? (
            <div className="grid gap-3 rounded-2xl bg-cempa-wash p-4">
              <p>
                <span className="font-semibold">Esta tarjeta se acaba de sellar.</span> ¿Es otra compra?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setConfirmAgain(false)}>
                  No, cancelar
                </Button>
                <Button onClick={() => doStamp(true)} disabled={pending}>
                  Sí, sellar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {!card.complete && options > 1 ? (
                <div role="radiogroup" aria-label="Sellos a dar" className="inline-flex rounded-full bg-mist p-1">
                  {Array.from({ length: options }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={qty === n}
                      onClick={() => setQty(n)}
                      className={`tabular rounded-full px-5 py-2 font-semibold ${qty === n ? "bg-paper shadow-sm" : "text-ink-2"}`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* El botón de sello */}
              <button
                type="button"
                onClick={() => (card.complete ? doRedeem() : doStamp())}
                disabled={pending}
                className={`relative flex h-40 w-40 flex-col items-center justify-center rounded-full font-display text-2xl font-bold shadow-[0_18px_36px_-14px_rgb(23_21_43/0.55)] transition-transform active:scale-95 disabled:opacity-60 ${
                  card.complete ? "bg-agave text-white" : "bg-cempa text-ink"
                }`}
              >
                {hit > 0 ? <span key={hit} className="ink-ring pointer-events-none absolute inset-0 rounded-full border-[6px] border-cempa" aria-hidden="true" /> : null}
                {card.complete ? <Gift size={36} aria-hidden="true" /> : <Stamp size={36} aria-hidden="true" />}
                <span className="mt-1.5">{pending ? "…" : card.complete ? "Canjear" : qty > 1 ? `Sellar +${qty}` : "Sellar"}</span>
              </button>

              {askTicket && !card.complete ? (
                <div className="w-full max-w-xs">
                  <label htmlFor="ticket" className="mb-1 block text-center text-sm text-ink-2">
                    Folio del ticket (opcional)
                  </label>
                  <input
                    id="ticket"
                    value={ticket}
                    onChange={(e) => setTicket(e.target.value)}
                    maxLength={40}
                    className="h-11 w-full rounded-full border-[1.5px] border-line px-4 text-center outline-none focus:border-ink"
                  />
                </div>
              ) : null}

              {undoable ? (
                <Button variant="quiet" size="sm" onClick={doUndo} disabled={pending}>
                  <Undo2 size={16} aria-hidden="true" />
                  Deshacer último sello
                </Button>
              ) : null}
            </div>
          )}

          <Button variant="primary" size="lg" className="w-full" onClick={next}>
            Siguiente cliente
          </Button>
        </div>
      )}
    </div>
  );
}
