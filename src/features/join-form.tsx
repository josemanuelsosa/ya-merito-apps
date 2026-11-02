"use client";

import { useActionState } from "react";
import { joinAction } from "@/server/actions/account";
import type { ActionResult } from "@/server/action";
import { Field, Input, Notice, SubmitButton } from "@/ui/form";

/** Alta del cliente final: dos campos y un botón. */
export function JoinForm({ slug, locationId }: { slug: string; locationId: string | null }) {
  const [state, action] = useActionState<ActionResult<null> | null, FormData>(joinAction, null);
  const err = (f: string) => (state && !state.ok ? state.fields?.[f] : undefined);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      {locationId ? <input type="hidden" name="location" value={locationId} /> : null}
      <Field label="Tu nombre" htmlFor="name" error={err("name")}>
        <Input id="name" name="name" autoComplete="given-name" required minLength={2} maxLength={60} placeholder="Ana" invalid={Boolean(err("name"))} />
      </Field>
      <Field label="Tu celular" htmlFor="phone" error={err("phone")} hint="Con él recuperas tu tarjeta si cambias de teléfono.">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required placeholder="81 1234 5678" invalid={Boolean(err("phone"))} />
      </Field>
      {/* Campo trampa: las personas no lo ven; los bots lo llenan */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">No llenar</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state && !state.ok && !state.fields ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending="Creando tu tarjeta…">Sacar mi tarjeta</SubmitButton>
      <p className="text-center text-xs leading-relaxed text-ink-3">
        Usamos tu nombre y celular solo para tu tarjeta en este negocio. No te mandamos publicidad sin tu permiso.
      </p>
    </form>
  );
}
