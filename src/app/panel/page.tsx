import type { Metadata } from "next";
import Link from "next/link";
import { Check, Gift, Stamp, UserPlus } from "lucide-react";
import { firstName, timeAgo } from "@/core/text";
import { can, requireStaffPage } from "@/server/auth/session";
import { topRecommendation } from "@/server/services/insights";
import { getDashboard } from "@/server/services/reports";
import { RecommendationCard } from "@/features/insights";
import { Bars, Empty, PageHeader, Section } from "@/ui/bits";
import { ButtonLink } from "@/ui/button";

export const metadata: Metadata = { title: "Inicio" };

const dayLabel = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function PanelHome({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const ctx = await requireStaffPage();
  const { bienvenida } = await searchParams;
  const [{ stats, series, activity, checklist }, tip] = await Promise.all([getDashboard(ctx), topRecommendation(ctx)]);
  const name = firstName(ctx.membership.name || "");

  const steps = [
    { done: checklist.design, label: "Ajusta tu premio y colores", href: "/panel/tarjeta", show: can(ctx, "program.edit") },
    { done: checklist.logo, label: "Sube tu logo", href: "/panel/tarjeta", show: can(ctx, "program.edit") },
    { done: checklist.firstCustomer, label: "Pega tu cartel QR junto a la caja", href: "/panel/qr", show: true },
    { done: checklist.firstStamp, label: "Da tu primer sello", href: "/panel/sellar", show: true },
    { done: checklist.team, label: "Invita a tu equipo", href: "/panel/equipo", show: can(ctx, "team.manage") },
  ].filter((s) => s.show);
  const pending = steps.filter((s) => !s.done).length;

  return (
    <div className="grid gap-10">
      <PageHeader
        title={bienvenida ? `¡Bienvenido${name ? `, ${name}` : ""}!` : `Hola${name ? `, ${name}` : ""}`}
        description={
          stats.visits_today > 0
            ? `Hoy van ${stats.stamps_today} sello${stats.stamps_today === 1 ? "" : "s"} en ${stats.visits_today} visita${stats.visits_today === 1 ? "" : "s"}.`
            : `${ctx.program.stamps_required} sellos = ${ctx.program.reward_description}.`
        }
        actions={
          <ButtonLink href="/panel/sellar" variant="accent">
            <Stamp size={18} aria-hidden="true" />
            Sellar
          </ButtonLink>
        }
      />

      {pending > 0 ? (
        <section aria-label="Pasos para dejar lista tu tarjeta" className="rounded-[22px] bg-mist p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-bold">Deja lista tu tarjeta</h2>
            <span className="tabular text-sm text-ink-2">
              {steps.length - pending} de {steps.length}
            </span>
          </div>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-paper">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-agave text-white" : "border-2 border-ink-3/50"}`}
                    aria-hidden="true"
                  >
                    {s.done ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <span className={s.done ? "text-ink-2 line-through decoration-ink-3" : "font-medium"}>{s.label}</span>
                  <span className="sr-only">{s.done ? "(hecho)" : "(pendiente)"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tip ? (
        <section aria-labelledby="tip">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="tip" className="font-display text-xl font-bold">
              Para vender más esta semana
            </h2>
            <Link href="/panel/estudio" className="text-sm font-semibold text-ink-2 hover:text-ink">
              Ver estudio
            </Link>
          </div>
          <RecommendationCard rec={tip} />
        </section>
      ) : null}

      <dl className="grid grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-line">
        <Stat label="Clientes" value={stats.customers} note={stats.enrollments_month ? `+${stats.enrollments_month} este mes` : undefined} />
        <Stat label="Sellos hoy" value={stats.stamps_today} />
        <Stat label="Premios listos" value={stats.rewards_ready} highlight={stats.rewards_ready > 0} href={stats.rewards_ready ? "/panel/clientes?filtro=premio" : undefined} />
        <Stat label="Regresan" value={`${stats.returning_rate}%`} note="con 2 visitas o más" />
      </dl>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Visitas, últimos 14 días">
          <Bars label="Visitas por día" points={series.map((p) => ({ label: dayLabel.format(new Date(`${p.day}T12:00:00Z`)), value: p.visits }))} />
        </Section>

        <Section title="Actividad" aside={<Link href="/panel/clientes" className="text-sm font-semibold text-ink-2 hover:text-ink">Ver clientes</Link>}>
          {activity.length === 0 ? (
            <Empty title="Aquí verás cada alta, sello y canje">Tus clientes se dan de alta escaneando tu cartel QR.</Empty>
          ) : (
            <ul className="grid gap-3">
              {activity.map((a) => {
                const Icon = a.kind === "redeem" ? Gift : a.kind === "enroll" ? UserPlus : Stamp;
                const what = a.kind === "redeem" ? "canjeó su premio" : a.kind === "enroll" ? "sacó su tarjeta" : a.delta === 1 ? "recibió un sello" : `recibió ${a.delta} sellos`;
                return (
                  <li key={a.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        a.kind === "redeem" ? "bg-agave-wash text-agave" : a.kind === "enroll" ? "bg-mist text-ink-2" : "bg-cempa-wash text-cempa-ink"
                      }`}
                    >
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <p className="min-w-0 flex-1 text-[15px] leading-snug">
                      {a.customerId ? (
                        <Link href={`/panel/clientes/${a.customerId}`} className="font-semibold hover:underline">
                          {a.customerName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{a.customerName}</span>
                      )}{" "}
                      {what}
                      <span className="block text-sm text-ink-3">
                        {timeAgo(a.at)}
                        {a.by ? `, por ${a.by}` : ""}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value, note, highlight, href }: { label: string; value: number | string; note?: string; highlight?: boolean; href?: string }) {
  const number = <span className={`tabular font-display text-[40px] leading-none font-bold tracking-[-0.02em] ${highlight ? "text-agave" : ""}`}>{value}</span>;
  return (
    <div className="md:px-6 md:first:pl-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="mt-1">
        {href ? (
          <Link href={href} className="hover:opacity-80">
            {number}
          </Link>
        ) : (
          number
        )}
      </dd>
      {note ? <dd className="mt-1.5 text-sm text-ink-3">{note}</dd> : null}
    </div>
  );
}
