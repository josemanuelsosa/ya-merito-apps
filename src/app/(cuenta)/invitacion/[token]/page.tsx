import type { Metadata } from "next";
import { roleLabel } from "@/core/catalog";
import { AcceptInviteForm } from "@/features/auth-forms";
import { getUser } from "@/server/auth/session";
import { getInvitation } from "@/server/services/team";
import { ButtonLink } from "@/ui/button";
import { Notice } from "@/ui/form";

export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, user] = await Promise.all([getInvitation(token), getUser()]);

  if (inv.status !== "valid") {
    const text = {
      used: "Esta invitación ya se usó. Si es tuya, entra con tu correo.",
      expired: "Esta invitación ya venció. Pide al dueño del negocio que te mande una nueva.",
      invalid: "Esta invitación no es válida. Pide al dueño del negocio que te mande una nueva.",
    }[inv.status];
    return (
      <>
        <h1 className="mb-6 font-display text-4xl font-bold tracking-[-0.02em]">Invitación</h1>
        <Notice tone="warn">{text}</Notice>
        <ButtonLink href="/login" variant="ghost" className="mt-6 self-start">
          Ir a entrar
        </ButtonLink>
      </>
    );
  }

  const where = inv.locationName ? ` en la sucursal ${inv.locationName}` : "";
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Te invitaron a {inv.businessName}</h1>
      <p className="mt-2 mb-8 text-ink-2">
        Entrarás como {roleLabel(inv.role).toLowerCase()}
        {where}. {user ? `Vas a usar tu cuenta ${user.email}.` : "Crea tu acceso para empezar a sellar."}
      </p>
      <AcceptInviteForm token={token} signedIn={Boolean(user)} suggestedName={inv.name ?? ""} />
    </>
  );
}
