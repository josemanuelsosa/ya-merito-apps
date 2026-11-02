import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/server/auth/session";
import { Scanner } from "@/features/scanner";
import { Notice } from "@/ui/form";

export const metadata: Metadata = { title: "Sellar" };

export default async function StampPage() {
  const ctx = await requireStaffPage("stamp");
  const fixed = Boolean(ctx.membership.location_id);

  return (
    <div className="grid gap-5">
      {!ctx.access.canOperate ? (
        <Notice tone="error">
          Tu prueba o plan terminó, así que no se puede sellar.{" "}
          {ctx.membership.role === "owner" ? (
            <Link href="/panel/plan" className="font-semibold underline">
              Activar mi plan
            </Link>
          ) : (
            "Avísale al dueño del negocio."
          )}
        </Notice>
      ) : null}
      <Scanner
        locations={fixed ? [] : ctx.locations.map((l) => ({ id: l.id, name: l.name }))}
        locationId={ctx.location?.id ?? null}
        locationName={ctx.location?.name ?? null}
        askTicket={ctx.access.plan.features.ticketRef}
        maxPerVisit={ctx.program.max_stamps_per_visit}
      />
    </div>
  );
}
