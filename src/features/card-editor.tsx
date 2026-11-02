"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Minus, Plus, TriangleAlert, Upload } from "lucide-react";
import { COLOR_PRESETS, STAMP_ICONS, type StampIcon } from "@/core/catalog";
import { isReadable } from "@/core/colors";
import { STAMP_ICON_PATHS } from "@/core/stamp-art";
import { saveProgramAction, uploadLogoAction } from "@/server/actions/panel";
import { Section } from "@/ui/bits";
import { Button } from "@/ui/button";
import { Field, Input, Textarea } from "@/ui/form";
import { useToast } from "@/ui/toast";
import { WalletPass } from "@/ui/wallet-pass";

interface Values {
  name: string;
  rewardDescription: string;
  stampsRequired: number;
  terms: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  stampIcon: StampIcon;
  maxStampsPerVisit: number;
}

export function CardEditor({ initial, businessName, logoUrl: initialLogo }: { initial: Values; businessName: string; logoUrl: string | null }) {
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [preview, setPreview] = useState(Math.max(1, Math.floor(initial.stampsRequired / 2)));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((prev) => ({ ...prev, [k]: value }));
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const readable = isReadable(v.foregroundColor, v.backgroundColor);

  function save() {
    startSave(async () => {
      const r = await saveProgramAction(v);
      if (r.ok) {
        setSaved(v);
        setFieldErrors({});
        toast("Tarjeta guardada. Se actualiza en los celulares en unos segundos.");
      } else {
        setFieldErrors(r.fields ?? {});
        toast(r.error, "error");
      }
    });
  }

  function upload(file: File) {
    const form = new FormData();
    form.append("logo", file);
    startUpload(async () => {
      const r = await uploadLogoAction(form);
      if (r.ok) {
        setLogoUrl(r.data);
        toast("Logo actualizado.");
      } else toast(r.error, "error");
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-8">
        <Section title="Premio">
          <div className="grid gap-5">
            <Field label="¿Qué se gana tu cliente?" htmlFor="reward" error={fieldErrors.rewardDescription}>
              <Input id="reward" value={v.rewardDescription} maxLength={80} onChange={(e) => set("rewardDescription", e.target.value)} placeholder="Un café americano gratis" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Stepper
                id="required"
                label="Sellos para ganar"
                value={v.stampsRequired}
                min={2}
                max={20}
                onChange={(n) => {
                  set("stampsRequired", n);
                  setPreview((p) => Math.min(p, n));
                }}
              />
              <Stepper
                id="maxvisit"
                label="Máximo de sellos por visita"
                value={v.maxStampsPerVisit}
                min={1}
                max={5}
                onChange={(n) => set("maxStampsPerVisit", n)}
                hint="Para compras grandes. Evita regalar sellos de más."
              />
            </div>
            <Field label="Términos (opcional)" htmlFor="terms" hint="Aparecen al reverso del pase.">
              <Textarea id="terms" value={v.terms} maxLength={400} onChange={(e) => set("terms", e.target.value)} placeholder="Un sello por compra mayor a $50. No acumulable con otras promociones." />
            </Field>
          </div>
        </Section>

        <Section title="Sello">
          <div role="radiogroup" aria-label="Ícono del sello" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STAMP_ICONS.map((icon) => {
              const on = v.stampIcon === icon.id;
              return (
                <button
                  key={icon.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("stampIcon", icon.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl py-3 text-sm font-medium transition-colors ${on ? "bg-ink text-paper" : "bg-mist text-ink-2 hover:text-ink"}`}
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={STAMP_ICON_PATHS[icon.id]} />
                  </svg>
                  {icon.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Colores">
          <div role="radiogroup" aria-label="Combinaciones de color" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {COLOR_PRESETS.map((c) => {
              const on = v.backgroundColor === c.bg && v.labelColor === c.label && v.foregroundColor === c.fg;
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setV((p) => ({ ...p, backgroundColor: c.bg, foregroundColor: c.fg, labelColor: c.label }))}
                  className={`aspect-square rounded-2xl p-1 ring-2 transition ${on ? "ring-ink" : "ring-transparent hover:ring-line"}`}
                >
                  <span className="flex h-full w-full items-end justify-end rounded-xl p-1.5" style={{ background: c.bg }}>
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: c.label }} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                ["backgroundColor", "Fondo"],
                ["foregroundColor", "Texto"],
                ["labelColor", "Sello"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="grid gap-1.5">
                <span className="text-sm font-semibold">{label}</span>
                <span className="flex h-12 items-center gap-2 rounded-xl border-[1.5px] border-line px-2.5">
                  <input type="color" value={v[k]} onChange={(e) => set(k, e.target.value.toUpperCase())} className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                  <span className="tabular truncate text-sm text-ink-2">{v[k]}</span>
                </span>
              </label>
            ))}
          </div>
          {!readable ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#8a3a05]">
              <TriangleAlert size={16} aria-hidden="true" />
              El texto casi no se lee sobre ese fondo. Prueba un color más claro u oscuro.
            </p>
          ) : null}
        </Section>

        <Section title="Logo">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-mist">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo actual" className="h-full w-full object-contain" />
              ) : (
                <span className="px-2 text-center text-xs text-ink-3">Sin logo</span>
              )}
            </div>
            <div className="grid gap-1">
              <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={18} aria-hidden="true" />
                {uploading ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
              </Button>
              <p className="text-sm text-ink-2">PNG con fondo transparente, cuadrado. Máximo 3 MB.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-4 text-sm text-ink-2">
            El nombre que aparece en el pase es “{businessName}”.{" "}
            <Link href="/panel/negocio" className="font-semibold text-ink underline-offset-4 hover:underline">
              Cambiarlo
            </Link>
          </p>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <div className="flex flex-col items-center gap-4">
          <WalletPass
            design={{ ...v, businessName, logoUrl }}
            stamps={preview}
            customerName="Ana López"
          />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="w-9 px-0" aria-label="Quitar un sello a la vista previa" onClick={() => setPreview((p) => Math.max(0, p - 1))}>
              <Minus size={16} />
            </Button>
            <span className="tabular w-36 text-center text-sm text-ink-2">
              Vista con {preview} sello{preview === 1 ? "" : "s"}
            </span>
            <Button variant="ghost" size="sm" className="w-9 px-0" aria-label="Agregar un sello a la vista previa" onClick={() => setPreview((p) => Math.min(v.stampsRequired, p + 1))}>
              <Plus size={16} />
            </Button>
          </div>
          <div className="no-print sticky bottom-24 w-full max-w-[360px] lg:static">
            <Button variant={dirty ? "accent" : "ghost"} size="lg" className="w-full shadow-[var(--shadow-float)] lg:shadow-none" onClick={save} disabled={!dirty || saving}>
              {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Todo guardado"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stepper({ id, label, value, min, max, onChange, hint }: { id: string; label: string; value: number; min: number; max: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex h-12 items-center rounded-xl border-[1.5px] border-line">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-full w-12 items-center justify-center text-ink-2 disabled:opacity-30" aria-label={`Menos: ${label}`}>
          <Minus size={18} />
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className="tabular h-full min-w-0 flex-1 bg-transparent text-center font-display text-xl font-bold outline-none"
        />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex h-full w-12 items-center justify-center text-ink-2 disabled:opacity-30" aria-label={`Más: ${label}`}>
          <Plus size={18} />
        </button>
      </div>
      {hint ? <p className="text-sm text-ink-2">{hint}</p> : null}
    </div>
  );
}
