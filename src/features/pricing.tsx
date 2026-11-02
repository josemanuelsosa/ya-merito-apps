"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { formatMXN, monthlyEquivalent, PLAN_ORDER, PLANS, priceFor, type BillingCycle, type PlanId } from "@/core/plans";
import { buttonClass } from "@/ui/button";
import { checkoutAction } from "@/server/actions/panel";
import { useToast } from "@/ui/toast";

/**
 * Tabla de precios. En la portada lleva a /registro; en el panel inicia el
 * pago con Mercado Pago.
 */
export function Pricing({ mode, currentPlan, canBuy = true }: { mode: "public" | "panel"; currentPlan?: PlanId | null; canBuy?: boolean }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [pending, start] = useTransition();
  const [choosing, setChoosing] = useState<PlanId | null>(null);
  const toast = useToast();

  function choose(plan: PlanId) {
    setChoosing(plan);
    start(async () => {
      const r = await checkoutAction({ plan, cycle });
      if (!r.ok) toast(r.error, "error");
      setChoosing(null);
    });
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Forma de pago" className="mb-8 inline-flex rounded-full bg-mist p-1">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cycle === c}
            onClick={() => setCycle(c)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${cycle === c ? "bg-paper text-ink shadow-sm" : "text-ink-2"}`}
          >
            {c === "monthly" ? "Mensual" : "Anual · 2 meses de regalo"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const featured = id === "pro";
          const isCurrent = currentPlan === id;
          return (
            <div
              key={id}
              className={`flex flex-col rounded-[22px] p-6 ${featured ? "bg-ink text-paper" : "bg-paper shadow-[inset_0_0_0_1.5px_var(--color-line)]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                {featured ? <span className="rounded-full bg-cempa px-2.5 py-1 text-xs font-semibold text-ink">El más elegido</span> : null}
              </div>
              <p className={`mt-1 text-[15px] ${featured ? "text-paper/70" : "text-ink-2"}`}>{plan.tagline}</p>

              <p className="mt-6 flex items-baseline gap-1">
                <span className="tabular font-display text-[44px] leading-none font-extrabold tracking-[-0.03em]">
                  {formatMXN(monthlyEquivalent(id, cycle))}
                </span>
                <span className={featured ? "text-paper/70" : "text-ink-2"}>/mes</span>
              </p>
              <p className={`mt-1 h-5 text-sm ${featured ? "text-paper/60" : "text-ink-3"}`}>
                {cycle === "yearly" ? `${formatMXN(priceFor(id, "yearly"))} al año` : "Cancela cuando quieras"}
              </p>

              <ul className="mt-6 grid gap-2.5 text-[15px]">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <Check size={18} className={`mt-0.5 shrink-0 ${featured ? "text-cempa" : "text-agave"}`} aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                {mode === "public" ? (
                  <a href="/registro" className={buttonClass(featured ? "accent" : "ghost", "lg", "w-full")}>
                    Probar 14 días gratis
                  </a>
                ) : isCurrent ? (
                  <span className={buttonClass(featured ? "accent" : "ghost", "lg", "w-full pointer-events-none opacity-70")}>Tu plan actual</span>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy || pending}
                    onClick={() => choose(id)}
                    className={buttonClass(featured ? "accent" : "primary", "lg", "w-full")}
                  >
                    {choosing === id ? "Abriendo Mercado Pago…" : `Elegir ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
