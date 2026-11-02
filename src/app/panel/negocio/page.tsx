import type { Metadata } from "next";
import { can, requireStaffPage } from "@/server/auth/session";
import { appUrl } from "@/server/env";
import { BusinessProfileForm, LocationsManager } from "@/features/business-settings";
import { PageHeader, Section } from "@/ui/bits";

export const metadata: Metadata = { title: "Negocio" };

export default async function BusinessPage() {
  const ctx = await requireStaffPage("program.edit");
  const b = ctx.business;
  return (
    <div className="grid gap-10">
      <PageHeader title="Negocio" description="Los datos que aparecen al reverso del pase y en tu página de alta." />

      <Section title="Datos del negocio">
        <BusinessProfileForm initial={{ name: b.name, category: b.category, phone: b.phone ?? "", address: b.address ?? "" }} />
        <p className="mt-6 text-sm text-ink-2">
          Tu página de alta: <span className="break-all text-ink">{`${appUrl()}/u/${b.slug}`}</span>
        </p>
      </Section>

      {can(ctx, "team.manage") ? (
        <Section title="Sucursales">
          <p className="mb-4 max-w-[60ch] text-[15px] text-ink-2">
            Una misma tarjeta vale en todas tus sucursales. Cada sello queda registrado con la sucursal donde se dio. Tu plan {ctx.access.plan.name} incluye{" "}
            {ctx.access.plan.limits.locations} sucursal{ctx.access.plan.limits.locations === 1 ? "" : "es"}.
          </p>
          <LocationsManager
            locations={ctx.locations.map((l) => ({ id: l.id, name: l.name, address: l.address ?? "" }))}
            canAdd={ctx.locations.length < ctx.access.plan.limits.locations}
            isOwner={ctx.membership.role === "owner"}
          />
        </Section>
      ) : null}
    </div>
  );
}
