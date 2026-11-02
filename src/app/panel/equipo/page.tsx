import type { Metadata } from "next";
import { requireStaffPage } from "@/server/auth/session";
import { getTeam } from "@/server/services/team";
import { TeamManager } from "@/features/team";
import { PageHeader } from "@/ui/bits";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const ctx = await requireStaffPage("team.manage");
  const team = await getTeam(ctx);
  const limit = ctx.access.plan.limits.staff;

  return (
    <div>
      <PageHeader
        title="Equipo"
        description={`Cada persona entra con su propio acceso, así sabes quién selló qué. Tu plan ${ctx.access.plan.name} incluye ${limit} usuarios; llevas ${team.seatsUsed}.`}
      />
      <TeamManager
        viewerRole={ctx.membership.role}
        members={team.members.map((m) => ({
          id: m.id,
          name: m.name || "Sin nombre",
          email: m.email,
          role: m.role,
          locationId: m.location_id,
          active: m.active,
          isYou: m.isYou,
        }))}
        invitations={team.invitations.map((i) => ({ id: i.id, name: i.name, role: i.role, expiresAt: i.expires_at, locationId: i.location_id }))}
        locations={ctx.locations.map((l) => ({ id: l.id, name: l.name }))}
        seatsLeft={Math.max(0, limit - team.seatsUsed)}
      />
    </div>
  );
}
