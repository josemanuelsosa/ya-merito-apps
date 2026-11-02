"use client";

import { useState, useTransition } from "react";
import { cancelPlanAction } from "@/server/actions/panel";
import { Button } from "@/ui/button";
import { useToast } from "@/ui/toast";

/** Cancelar con confirmación dentro de la página (sin diálogos del navegador). */
export function CancelPlan() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[52ch] text-[15px] text-ink-2">Si cancelas, ya no se te cobrará. Tu plan sigue funcionando hasta el fin del periodo que ya pagaste.</p>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Cancelar mi plan
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-2xl bg-chile-wash p-5">
      <p className="font-semibold text-[#a92a21]">¿Seguro? Al terminar tu periodo ya no podrás sellar ni dar de alta clientes.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          No, mantener mi plan
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelPlanAction();
              toast(r.ok ? "Plan cancelado." : r.error, r.ok ? "ok" : "error");
              setConfirming(false);
            })
          }
        >
          {pending ? "Cancelando…" : "Sí, cancelar"}
        </Button>
      </div>
    </div>
  );
}
