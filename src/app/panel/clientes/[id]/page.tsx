import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gift, MessageCircle, Stamp, Undo2, UserPlus } from "lucide-react";
import { LIFECYCLE, lifecycleOf, type Lifecycle } from "@/core/insights";
import { formatMxPhone, maskPhone, whatsappLink } from "@/core/phone";
import { firstName, timeAgo } from "@/core/text";
import { can, requireStaffPage } from "@/server/auth/session";
import { getCustomer } from "@/server/services/customers";
import { appUrl } from "@/server/env";
import { Pill, Section, StampDots } from "@/ui/bits";
import { ButtonLink } from "@/ui/button";

export const metadata: Metadata = { title: "Cliente" };

const LIFECYCLE_TONE: Record<Lifecycle, "agave" | "cempa" | "chile" | "mist"> = {
  frecuente: "agave",
  ocasional: "mist",
  nuevo: "cempa",
  en_riesgo: "chile",
  perdido: "mist",
};

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffPage("customers.view");
  const { id } = await params;
  const detail = await getCustomer(ctx, id);
  if (!detail) notFound();
  const { row, headline, events } = detail;
  const full = can(ctx, "reports");
  const stage = lifecycleOf(row);
  const stageInfo = LIFECYCLE.find((l) => l.id === stage)!;
  const dateFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: ctx.business.timezone });

  const reminder = row.complete
    ? `¡Hola ${firstName(row.name)}! Tu premio en ${ctx.business.name} ya está listo: ${ctx.program.reward_description}. ¡Te esperamos!`
    : `¡Hola ${firstName(row.name)}! Llevas ${row.stamps} de ${row.required} sellos en ${ctx.business.name}. Tu tarjeta: ${appUrl()}/c/${row.serial}`;

  return (
    <div className="grid gap-8">
      <Link href="/panel/clientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        Clientes
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-[38px] leading-tight font-bold tracking-[-0.02em]">{row.name}</h1>
          <p className="mt-2">
            <span title={stageInfo.description}>
              <Pill tone={LIFECYCLE_TONE[stage]}>{stageInfo.one}</Pill>
            </span>
          </p>
          <p className="mt-2 text-ink-2">
            {full ? formatMxPhone(row.phone) : maskPhone(row.phone)} · cliente desde {timeAgo(row.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {full ? (
            <ButtonLink href={whatsappLink(row.phone, reminder)} variant="ghost" target="_blank" rel="noopener">
              <MessageCircle size={18} aria-hidden="true" />
              Mandar WhatsApp
            </ButtonLink>
          ) : null}
          <ButtonLink href="/panel/sellar" variant="accent">
            <Stamp size={18} aria-hidden="true" />
            Sellar
          </ButtonLink>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-4">
        <div className="col-span-2">
          <dt className="text-sm text-ink-2">Tarjeta</dt>
          <dd className="mt-2">
            <StampDots stamps={row.stamps} required={row.required} size={18} />
          </dd>
          <dd className={`mt-1.5 font-semibold ${row.complete ? "text-agave" : ""}`}>{headline}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Visitas</dt>
          <dd className="tabular font-display text-3xl font-bold">{row.visits}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Premios</dt>
          <dd className="tabular font-display text-3xl font-bold">{row.redemptions}</dd>
        </div>
      </dl>

      <Section title="Historial">
        <ol className="grid gap-4">
          {events.map((e) => {
            const Icon = e.kind === "redeem" ? Gift : e.kind === "enroll" ? UserPlus : e.kind === "undo" ? Undo2 : Stamp;
            const text =
              e.kind === "enroll"
                ? "Sacó su tarjeta"
                : e.kind === "redeem"
                  ? `Canjeó: ${e.reward ?? "premio"}`
                  : e.kind === "undo"
                    ? `Se deshizo ${Math.abs(e.delta) === 1 ? "un sello" : `${Math.abs(e.delta)} sellos`}`
                    : e.delta === 1
                      ? "Un sello"
                      : `${e.delta} sellos`;
            return (
              <li key={e.id} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    e.kind === "redeem" ? "bg-agave-wash text-agave" : e.kind === "stamp" ? "bg-cempa-wash text-cempa-ink" : "bg-mist text-ink-2"
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {text}
                    {e.kind !== "enroll" ? <span className="tabular font-normal text-ink-3"> · quedó en {e.stampsAfter}</span> : null}
                  </p>
                  <p className="text-sm text-ink-2">
                    {dateFmt.format(new Date(e.at))}
                    {e.by ? `, ${e.by}` : ""}
                    {e.location ? `, ${e.location}` : ""}
                    {e.ticketRef ? `, folio ${e.ticketRef}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}
