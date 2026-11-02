import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatMXN, priceFor } from "@/core/plans";
import { requireStaffPage } from "@/server/auth/session";
import { features } from "@/server/env";
import { syncFromReturn } from "@/server/services/billing";
import { Pricing } from "@/features/pricing";
import { CancelPlan } from "@/features/cancel-plan";
import { PageHeader, Section } from "@/ui/bits";
import { Notice } from "@/ui/form";

export const metadata: Metadata = { title: "Plan" };

const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ pago?: string; preapproval_id?: string }> }) {
  const ctx = await requireStaffPage("billing");
  const sp = await searchParams;
  if (sp.preapproval_id) {
    // Al volver de Mercado Pago: sincroniza y recarga limpia para mostrar el plan nuevo
    await syncFromReturn(ctx, sp.preapproval_id);
    redirect("/panel/plan?pago=procesando");
  }
  const { access, subscription: sub } = ctx;

  const status = (() => {
    switch (access.phase) {
      case "trial":
        return `Estás en tu prueba del plan ${access.plan.name}. Te ${access.daysLeft === 1 ? "queda 1 día" : `quedan ${access.daysLeft} días`}.`;
      case "active":
        if (sub?.status === "canceled" || sub?.status === "paused")
          return `Cancelaste tu plan ${access.plan.name}. Sigue activo hasta el ${sub.current_period_end ? dateFmt.format(new Date(sub.current_period_end)) : "fin del periodo"}.`;
        return `Plan ${access.plan.name} ${sub?.billing_cycle === "yearly" ? "anual" : "mensual"}: ${formatMXN(priceFor(access.plan.id, sub?.billing_cycle ?? "monthly"))}.${
          sub?.current_period_end ? ` Siguiente cobro el ${dateFmt.format(new Date(sub.current_period_end))}.` : ""
        }`;
      case "grace":
        return `No se pudo cobrar tu plan. Actualiza tu forma de pago en Mercado Pago; sigues operando ${access.daysLeft} día${access.daysLeft === 1 ? "" : "s"} más.`;
      default:
        return "Tu prueba o plan terminó. Elige un plan para volver a sellar; tus clientes y sus pases siguen intactos.";
    }
  })();

  const paying = sub?.provider_subscription_id && sub.status === "active";

  return (
    <div className="grid gap-10">
      <PageHeader title="Plan" description={status} />

      {sp.pago === "procesando" ? (
        <Notice tone="ok">Gracias. Mercado Pago está confirmando tu pago; tu plan se activa en cuanto nos avise (normalmente en segundos).</Notice>
      ) : null}
      {!features.mercadopago ? (
        <Notice tone="warn">El cobro en línea aún no está configurado en este servidor (falta MP_ACCESS_TOKEN). Puedes activar planes a mano desde la base de datos.</Notice>
      ) : null}

      <Section title={paying ? "Cambiar de plan" : "Elige tu plan"}>
        <p className="mb-6 max-w-[60ch] text-[15px] text-ink-2">
          El cobro es automático cada mes o cada año con tu tarjeta en Mercado Pago. Puedes cancelar cuando quieras y tu plan sigue activo hasta el fin del periodo pagado.
        </p>
        <Pricing mode="panel" currentPlan={paying ? access.plan.id : null} canBuy={features.mercadopago} />
      </Section>

      {paying ? (
        <Section title="Cancelar">
          <CancelPlan />
        </Section>
      ) : null}
    </div>
  );
}
