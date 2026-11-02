import Link from "next/link";
import { roleLabel } from "@/core/catalog";
import { can, requireStaffPage, type StaffContext } from "@/server/auth/session";
import { PanelShell } from "@/features/panel-shell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaffPage();

  return (
    <PanelShell
      businessName={ctx.business.name}
      roleLabel={roleLabel(ctx.membership.role)}
      email={ctx.user.email}
      businesses={ctx.businesses}
      activeBusinessId={ctx.business.id}
      locationName={ctx.locations.length > 1 ? (ctx.location?.name ?? null) : null}
      nav={{
        design: can(ctx, "program.edit"),
        reports: can(ctx, "reports"),
        team: can(ctx, "team.manage"),
        billing: can(ctx, "billing"),
        business: can(ctx, "program.edit"),
      }}
      banner={<PlanBanner ctx={ctx} />}
    >
      {children}
    </PanelShell>
  );
}

/** Franja superior: días de prueba, periodo de gracia o plan vencido. */
function PlanBanner({ ctx }: { ctx: StaffContext }) {
  const { phase, daysLeft } = ctx.access;
  const isOwner = can(ctx, "billing");
  const link = isOwner ? (
    <Link href="/panel/plan" className="font-semibold underline underline-offset-4">
      {phase === "trial" ? "Elegir mi plan" : "Activar mi plan"}
    </Link>
  ) : (
    <span>Avísale al dueño del negocio.</span>
  );

  if (phase === "trial" && daysLeft !== null && daysLeft <= 7) {
    return (
      <div className="no-print bg-cempa-wash px-4 py-2.5 text-center text-sm text-[#8a3a05]">
        Te {daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`} de prueba. {link}
      </div>
    );
  }
  if (phase === "grace") {
    return (
      <div className="no-print bg-cempa-wash px-4 py-2.5 text-center text-sm text-[#8a3a05]">
        No se pudo cobrar tu plan. Sigues operando {daysLeft} día{daysLeft === 1 ? "" : "s"} más. {link}
      </div>
    );
  }
  if (phase === "expired") {
    return (
      <div className="no-print bg-chile-wash px-4 py-2.5 text-center text-sm text-[#a92a21]">
        Tu prueba o plan terminó: no se puede sellar ni dar de alta clientes. Tus datos y los pases de tus clientes siguen intactos. {link}
      </div>
    );
  }
  return null;
}
