import type { Metadata } from "next";
import { requireStaffPage } from "@/server/auth/session";
import { CardEditor } from "@/features/card-editor";
import { PageHeader } from "@/ui/bits";

export const metadata: Metadata = { title: "Tu tarjeta" };

export default async function CardPage() {
  const ctx = await requireStaffPage("program.edit");
  const { program: p, business: b } = ctx;
  return (
    <div>
      <PageHeader title="Tu tarjeta" description="Así la ven tus clientes en Apple Wallet y Google Wallet. Al guardar, se actualiza en el celular de todos." />
      <CardEditor
        businessName={b.name}
        logoUrl={b.logo_url}
        initial={{
          name: p.name,
          rewardDescription: p.reward_description,
          stampsRequired: p.stamps_required,
          terms: p.terms ?? "",
          backgroundColor: p.background_color,
          foregroundColor: p.foreground_color,
          labelColor: p.label_color,
          stampIcon: p.stamp_icon,
          maxStampsPerVisit: p.max_stamps_per_visit,
        }}
      />
    </div>
  );
}
