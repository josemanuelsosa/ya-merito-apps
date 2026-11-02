import type { Metadata } from "next";
import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { can, requireStaffPage } from "@/server/auth/session";
import { getReport } from "@/server/services/reports";
import { Bars, PageHeader, Section } from "@/ui/bits";
import { ButtonLink } from "@/ui/button";

export const metadata: Metadata = { title: "Reportes" };

const RANGES = [7, 30, 90] as const;
const short = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ dias?: string; s?: string }> }) {
  const ctx = await requireStaffPage("reports");
  const sp = await searchParams;
  const wanted = RANGES.find((r) => String(r) === sp.dias) ?? 30;
  const locationId = ctx.locations.some((l) => l.id === sp.s) ? sp.s! : null;
  const r = await getReport(ctx, { days: wanted, locationId });
  const canExport = ctx.access.plan.features.export;

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { dias: String(r.days), s: locationId ?? undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/panel/reportes?${p.toString()}`;
  };

  return (
    <div className="grid gap-10">
      <PageHeader
        title="Reportes"
        description={`Del ${short.format(new Date(`${r.from}T12:00:00Z`))} al ${short.format(new Date(`${r.to}T12:00:00Z`))}${locationId ? `, ${ctx.locations.find((l) => l.id === locationId)?.name}` : ""}.`}
        actions={
          canExport ? (
            <ButtonLink href={`/api/panel/export?dias=${r.days}`} variant="ghost">
              <Download size={18} aria-hidden="true" />
              Descargar para Excel
            </ButtonLink>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {r.full ? (
          RANGES.map((d) => (
            <Link key={d} href={qs({ dias: String(d) })} aria-current={d === r.days ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${d === r.days ? "bg-ink text-paper" : "bg-mist text-ink-2"}`}>
              {d} días
            </Link>
          ))
        ) : (
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">7 días</span>
        )}
        {ctx.locations.length > 1 ? (
          <>
            <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
            <Link href={qs({ s: undefined })} aria-current={!locationId ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${!locationId ? "bg-ink text-paper" : "bg-mist text-ink-2"}`}>
              Todas
            </Link>
            {ctx.locations.map((l) => (
              <Link key={l.id} href={qs({ s: l.id })} aria-current={l.id === locationId ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${l.id === locationId ? "bg-ink text-paper" : "bg-mist text-ink-2"}`}>
                {l.name}
              </Link>
            ))}
          </>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-line">
        {[
          ["Visitas", r.totals.visits],
          ["Sellos", r.totals.stamps],
          ["Premios canjeados", r.totals.redemptions],
          ["Clientes nuevos", r.totals.enrollments],
        ].map(([label, value]) => (
          <div key={label} className="md:px-6 md:first:pl-0">
            <dt className="text-sm text-ink-2">{label}</dt>
            <dd className="tabular mt-1 font-display text-[40px] leading-none font-bold tracking-[-0.02em]">{value}</dd>
          </div>
        ))}
      </dl>

      <Section title="Visitas por día">
        <Bars label="Visitas por día" height={160} highlightLast={false} points={r.series.map((p) => ({ label: short.format(new Date(`${p.day}T12:00:00Z`)), value: p.visits }))} />
      </Section>

      {r.full ? (
        <Section title="Por persona del equipo">
          {r.staff.length === 0 ? (
            <p className="text-ink-2">Todavía no hay sellos en este periodo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-2">
                    <th className="py-2 font-semibold">Persona</th>
                    <th className="tabular py-2 text-right font-semibold">Sellos</th>
                    <th className="tabular py-2 text-right font-semibold">Canjes</th>
                    <th className="tabular py-2 text-right font-semibold">Deshechos</th>
                  </tr>
                </thead>
                <tbody>
                  {r.staff.map((s) => (
                    <tr key={s.membership_id ?? "sin"} className="border-b border-line">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="tabular py-3 text-right">{s.stamps}</td>
                      <td className="tabular py-3 text-right">{s.redemptions}</td>
                      <td className={`tabular py-3 text-right ${s.undos > 3 ? "font-semibold text-chile" : ""}`}>{s.undos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-ink-2">Muchos sellos deshechos pueden indicar errores o sellos regalados. Revisa el historial del cliente.</p>
            </div>
          )}
        </Section>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-mist p-6">
          <div className="flex items-start gap-3">
            <Lock size={20} className="mt-0.5 text-ink-2" aria-hidden="true" />
            <div>
              <p className="font-semibold">Reportes por cajero, rangos de 90 días y descarga para Excel</p>
              <p className="text-[15px] text-ink-2">Vienen en los planes Pro y Cadena.</p>
            </div>
          </div>
          {can(ctx, "billing") ? (
            <ButtonLink href="/panel/plan" variant="primary">
              Ver planes
            </ButtonLink>
          ) : null}
        </div>
      )}
    </div>
  );
}
