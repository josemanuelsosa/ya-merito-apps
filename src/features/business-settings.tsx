"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { MapPin, Plus } from "lucide-react";
import { CATEGORIES } from "@/core/catalog";
import { archiveLocationAction, saveBusinessAction, saveLocationAction } from "@/server/actions/panel";
import type { ActionResult } from "@/server/action";
import { Button } from "@/ui/button";
import { Field, Input, Select, SubmitButton } from "@/ui/form";
import { useToast } from "@/ui/toast";

export function BusinessProfileForm({ initial }: { initial: { name: string; category: string; phone: string; address: string } }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionResult<null> | null, FormData>(saveBusinessAction, null);
  useEffect(() => {
    if (state?.ok) toast("Datos guardados.");
    else if (state && !state.ok) toast(state.error, "error");
  }, [state, toast]);
  const err = (f: string) => (state && !state.ok ? state.fields?.[f] : undefined);

  return (
    <form action={action} className="grid max-w-xl gap-5">
      <Field label="Nombre" htmlFor="b-name" error={err("name")} hint="Aparece arriba del pase.">
        <Input id="b-name" name="name" defaultValue={initial.name} maxLength={60} required />
      </Field>
      <Field label="Giro" htmlFor="b-category">
        <Select id="b-category" name="category" defaultValue={initial.category}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teléfono (opcional)" htmlFor="b-phone">
          <Input id="b-phone" name="phone" type="tel" defaultValue={initial.phone} />
        </Field>
        <Field label="Dirección (opcional)" htmlFor="b-address">
          <Input id="b-address" name="address" defaultValue={initial.address} />
        </Field>
      </div>
      <div className="max-w-xs">
        <SubmitButton size="md" pending="Guardando…">
          Guardar datos
        </SubmitButton>
      </div>
    </form>
  );
}

export function LocationsManager({
  locations,
  canAdd,
  isOwner,
}: {
  locations: { id: string; name: string; address: string }[];
  canAdd: boolean;
  isOwner: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);

  function save(form: FormData, id?: string) {
    start(async () => {
      const r = await saveLocationAction({ id, name: String(form.get("name") ?? ""), address: String(form.get("address") ?? "") });
      if (r.ok) {
        toast(id ? "Sucursal guardada." : "Sucursal agregada.");
        setAdding(false);
      } else toast(r.error, "error");
    });
  }

  return (
    <div className="grid gap-4">
      <ul className="divide-y divide-line border-y border-line">
        {locations.map((l) => (
          <li key={l.id} className="py-3">
            <form action={(f) => save(f, l.id)} className="flex flex-wrap items-end gap-3">
              <MapPin size={18} className="mb-3.5 text-ink-3" aria-hidden="true" />
              <label className="grid min-w-40 flex-1 gap-1">
                <span className="sr-only">Nombre de la sucursal</span>
                <Input name="name" defaultValue={l.name} />
              </label>
              <label className="grid min-w-48 flex-[2] gap-1">
                <span className="sr-only">Dirección</span>
                <Input name="address" defaultValue={l.address} placeholder="Dirección (opcional)" />
              </label>
              <Button type="submit" variant="ghost" disabled={pending}>
                Guardar
              </Button>
              {locations.length > 1 ? (
                <Button
                  variant="quiet"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await archiveLocationAction(l.id);
                      toast(r.ok ? "Sucursal archivada." : r.error, r.ok ? "ok" : "error");
                    })
                  }
                >
                  Archivar
                </Button>
              ) : null}
            </form>
          </li>
        ))}
      </ul>

      {adding ? (
        <form action={(f) => save(f)} className="flex flex-wrap items-end gap-3 rounded-2xl bg-mist p-4">
          <label className="grid min-w-40 flex-1 gap-1">
            <span className="text-sm font-semibold">Nombre</span>
            <Input name="name" placeholder="Sucursal Centro" autoFocus />
          </label>
          <label className="grid min-w-48 flex-[2] gap-1">
            <span className="text-sm font-semibold">Dirección (opcional)</span>
            <Input name="address" />
          </label>
          <Button type="submit" disabled={pending}>
            Agregar
          </Button>
          <Button variant="quiet" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        </form>
      ) : canAdd ? (
        <Button variant="ghost" className="justify-self-start" onClick={() => setAdding(true)}>
          <Plus size={18} aria-hidden="true" />
          Agregar sucursal
        </Button>
      ) : (
        <p className="text-sm text-ink-2">
          Llegaste al límite de sucursales de tu plan.{" "}
          {isOwner ? (
            <Link href="/panel/plan" className="font-semibold text-ink underline">
              Ver planes
            </Link>
          ) : null}
        </p>
      )}
    </div>
  );
}
