"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Copy, MessageCircle, UserPlus, X } from "lucide-react";
import { ROLES, roleLabel, type Role } from "@/core/catalog";
import { inviteAction, revokeInviteAction, updateMemberAction } from "@/server/actions/panel";
import { Avatar, Pill, Section } from "@/ui/bits";
import { Button, ButtonLink } from "@/ui/button";
import { Field, Input, Select } from "@/ui/form";
import { useToast } from "@/ui/toast";

interface Member {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  locationId: string | null;
  active: boolean;
  isYou: boolean;
}

export function TeamManager({
  viewerRole,
  members,
  invitations,
  locations,
  seatsLeft,
}: {
  viewerRole: Role;
  members: Member[];
  invitations: { id: string; name: string | null; role: "manager" | "cashier"; expiresAt: string; locationId: string | null }[];
  locations: { id: string; name: string }[];
  seatsLeft: number;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState<{ url: string; message: string } | null>(null);
  const isOwner = viewerRole === "owner";
  const locName = (id: string | null) => (id ? (locations.find((l) => l.id === id)?.name ?? "Sucursal") : "Todas las sucursales");

  function update(input: Parameters<typeof updateMemberAction>[0], done: string) {
    start(async () => {
      const r = await updateMemberAction(input);
      toast(r.ok ? done : r.error, r.ok ? "ok" : "error");
    });
  }

  function invite(form: FormData) {
    start(async () => {
      const r = await inviteAction({
        role: (form.get("role") as "manager" | "cashier") ?? "cashier",
        name: String(form.get("name") ?? "") || undefined,
        locationId: (form.get("locationId") as string) || null,
      });
      if (r.ok) setLink(r.data);
      else toast(r.error, "error");
    });
  }

  function openInvite() {
    setLink(null);
    dialog.current?.showModal();
  }

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="accent" onClick={openInvite} disabled={seatsLeft === 0}>
          <UserPlus size={18} aria-hidden="true" />
          Invitar a alguien
        </Button>
        {seatsLeft === 0 ? (
          <p className="text-sm text-ink-2">
            Ya usaste todos los usuarios de tu plan.{" "}
            {isOwner ? (
              <Link href="/panel/plan" className="font-semibold text-ink underline">
                Ver planes
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>

      <Section title="Personas">
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const editable = !m.isYou && (isOwner || m.role === "cashier");
            return (
              <li key={m.id} className={`flex flex-wrap items-center gap-4 py-4 ${m.active ? "" : "opacity-55"}`}>
                <Avatar name={m.name} tone={m.role === "owner" ? "cempa" : "mist"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.name} {m.isYou ? <span className="font-normal text-ink-3">(tú)</span> : null}
                  </p>
                  <p className="truncate text-sm text-ink-2">{m.email}</p>
                </div>
                {editable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${m.id}`}>
                      Rol de {m.name}
                    </label>
                    <select
                      id={`role-${m.id}`}
                      defaultValue={m.role}
                      disabled={pending || !isOwner}
                      onChange={(e) => update({ membershipId: m.id, role: e.target.value as Role }, "Rol actualizado.")}
                      className="h-9 rounded-full bg-mist px-3 text-sm font-semibold outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {locations.length > 1 ? (
                      <>
                        <label className="sr-only" htmlFor={`loc-${m.id}`}>
                          Sucursal de {m.name}
                        </label>
                        <select
                          id={`loc-${m.id}`}
                          defaultValue={m.locationId ?? ""}
                          disabled={pending}
                          onChange={(e) => update({ membershipId: m.id, locationId: e.target.value || null }, "Sucursal actualizada.")}
                          className="h-9 rounded-full bg-mist px-3 text-sm font-semibold outline-none"
                        >
                          <option value="">Todas las sucursales</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}
                    <Button
                      variant={m.active ? "danger" : "ghost"}
                      size="sm"
                      disabled={pending}
                      onClick={() => update({ membershipId: m.id, active: !m.active }, m.active ? `${m.name} ya no tiene acceso.` : `${m.name} tiene acceso otra vez.`)}
                    >
                      {m.active ? "Quitar acceso" : "Devolver acceso"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone={m.role === "owner" ? "cempa" : "mist"}>{roleLabel(m.role)}</Pill>
                    {locations.length > 1 ? <Pill>{locName(m.locationId)}</Pill> : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {invitations.length ? (
        <Section title="Invitaciones pendientes">
          <ul className="divide-y divide-line">
            {invitations.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{i.name ?? "Sin nombre"}</p>
                  <p className="text-sm text-ink-2">
                    {roleLabel(i.role)}
                    {locations.length > 1 ? `, ${locName(i.locationId)}` : ""} · vence {new Date(i.expiresAt).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await revokeInviteAction(i.id);
                      toast(r.ok ? "Invitación cancelada." : r.error, r.ok ? "ok" : "error");
                    })
                  }
                >
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Qué puede hacer cada quien">
        <dl className="grid gap-4 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.id}>
              <dt className="font-semibold">{r.label}</dt>
              <dd className="mt-1 text-[15px] text-ink-2">{r.description}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,440px)] rounded-[24px] bg-paper p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/35"
        onClose={() => setLink(null)}
      >
        <div className="grid gap-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">{link ? "Invitación lista" : "Invitar a tu equipo"}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-full p-2 text-ink-2 hover:bg-mist" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>

          {link ? (
            <>
              <p className="text-ink-2">Mándale este enlace. Vale 7 días y solo se puede usar una vez.</p>
              <p className="rounded-xl bg-mist px-4 py-3 text-sm break-all select-all">{link.url}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ButtonLink href={`https://wa.me/?text=${encodeURIComponent(link.message)}`} variant="accent" target="_blank" rel="noopener">
                  <MessageCircle size={18} aria-hidden="true" />
                  Mandar por WhatsApp
                </ButtonLink>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link.url);
                      toast("Enlace copiado.");
                    } catch {
                      toast("No se pudo copiar. Selecciona el enlace.", "error");
                    }
                  }}
                >
                  <Copy size={18} aria-hidden="true" />
                  Copiar enlace
                </Button>
              </div>
            </>
          ) : (
            <form action={invite} className="grid gap-4">
              <Field label="Nombre (opcional)" htmlFor="inv-name">
                <Input id="inv-name" name="name" placeholder="Pepe" />
              </Field>
              <Field label="Rol" htmlFor="inv-role">
                <Select id="inv-role" name="role" defaultValue="cashier">
                  <option value="cashier">Cajero: solo sella y canjea</option>
                  {isOwner ? <option value="manager">Gerente: también diseña y ve reportes</option> : null}
                </Select>
              </Field>
              {locations.length > 1 ? (
                <Field label="Sucursal" htmlFor="inv-loc">
                  <Select id="inv-loc" name="locationId" defaultValue="">
                    <option value="">Todas las sucursales</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Button type="submit" variant="primary" size="lg" disabled={pending}>
                {pending ? "Creando…" : "Crear invitación"}
              </Button>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );
}
