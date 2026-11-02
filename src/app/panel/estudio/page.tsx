import type { Metadata } from "next";
import { Lock, Sparkles } from "lucide-react";
import { categoryPlural } from "@/core/catalog";
import { can, requireStaffPage } from "@/server/auth/session";
import { getInsights } from "@/server/services/insights";
import { CohortTable, HeatmapView, KeyNumbers, LocationsTable, PeerComparison, RecommendationCard, SegmentBar } from "@/features/insights";
import { Empty, PageHeader, Section } from "@/ui/bits";
import { ButtonLink } from "@/ui/button";

export const metadata: Metadata = { title: "Estudio de mercado" };

export default async function InsightsPage() {
  const ctx = await requireStaffPage("reports");
  const data = await getInsights(ctx);
  const plural = categoryPlural(ctx.business.category);
  const s = data.segments;

  if (s.total === 0) {
    return (
      <div>
        <PageHeader title="Estudio de mercado" description="Quiénes son tus clientes, cuándo vienen y qué hacer cada semana para vender más." />
        <Empty
          icon={<Sparkles size={22} />}
          title="Tu estudio aparece con tus primeros clientes"
          action={
            <ButtonLink href="/panel/qr" variant="primary">
              Ver mi cartel QR
            </ButtonLink>
          }
        >
          Cada alta y cada sello alimentan este estudio. Con unas semanas de uso verás tus horas fuertes, quién está por dejar de venir y cómo te va contra otras {plural}.
        </Empty>
      </div>
    );
  }

  return (
    <div className="grid gap-12">
      <PageHeader
        title="Estudio de mercado"
        description={`${s.total} ${s.total === 1 ? "cliente" : "clientes"} con tarjeta. Esto es lo que dicen sus visitas y lo que te conviene hacer esta semana.`}
      />

      <section aria-labelledby="hacer">
        <h2 id="hacer" className="mb-4 font-display text-xl font-bold tracking-[-0.01em]">
          Qué hacer esta semana
        </h2>
        {data.recommendations.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.recommendations.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </div>
        ) : (
          <p className="text-ink-2">Todo en orden por ahora. Vuelve en unos días: las recomendaciones cambian con cada visita.</p>
        )}
        {data.lockedRecommendations > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2">
            <Lock size={14} aria-hidden="true" />
            {data.lockedRecommendations} {data.lockedRecommendations === 1 ? "recomendación más" : "recomendaciones más"} en el estudio completo (planes Pro y Cadena).
          </p>
        ) : null}
      </section>

      <Section title="Tus números clave">
        <KeyNumbers s={s} />
      </Section>

      <Section title="Quiénes son tus clientes">
        <SegmentBar s={s} />
      </Section>

      {data.full ? (
        <>
          <Section title="Cuándo vienen">
            <HeatmapView h={data.heatmap} />
          </Section>

          <Section title="Cuántos regresan, mes con mes">
            <CohortTable cohorts={data.cohorts} />
          </Section>

          <Section title={`Contra otras ${plural}`}>
            <PeerComparison rows={data.comparison} peers={!!data.benchmark} plural={plural} businesses={data.benchmark?.businesses ?? 0} />
          </Section>

          {data.locations.length > 1 ? (
            <Section title="Sucursales">
              <LocationsTable rows={data.locations} />
            </Section>
          ) : null}
        </>
      ) : (
        <section aria-label="Estudio completo" className="overflow-hidden rounded-[22px] bg-ink p-6 text-paper sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-cempa">
            <Lock size={15} aria-hidden="true" />
            Estudio completo
          </div>
          <h2 className="mt-2 max-w-[28ch] font-display text-[26px] leading-tight font-bold tracking-[-0.01em]">Descubre tus horas flojas y cómo te va contra otras {plural}</h2>
          <ul className="mt-4 grid gap-2 text-[15px] text-paper/80 sm:grid-cols-2">
            <li>• Mapa de visitas por día y hora</li>
            <li>• Cuántos regresan mes con mes</li>
            <li>• Comparativo con negocios de tu giro</li>
            <li>• Recomendaciones de precio, tarjeta y horario</li>
          </ul>
          {can(ctx, "billing") ? (
            <ButtonLink href="/panel/plan" variant="accent" className="mt-6">
              Ver plan Pro
            </ButtonLink>
          ) : (
            <p className="mt-6 text-sm text-paper/70">Pídele al dueño del negocio que active el plan Pro.</p>
          )}
        </section>
      )}

      <p className="text-sm text-ink-3">
        Se calcula con los sellos de tu negocio. Un cliente que viene sin pedir sello no aparece, así que entre más se use la tarjeta, más preciso es.
      </p>
    </div>
  );
}
