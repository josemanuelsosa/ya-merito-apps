// PassKit Web Service · ¿qué pases de este iPhone cambiaron desde la última vez?
import { db } from "@/server/db";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ deviceId: string; passTypeId: string }> };

type Row = {
  serial_number: string;
  cards: { updated_at: string; programs: { updated_at: string } | null; businesses: { updated_at: string } | null } | null;
};

export async function GET(request: Request, { params }: Ctx) {
  const { deviceId, passTypeId } = await params;
  const since = Number(new URL(request.url).searchParams.get("passesUpdatedSince") ?? 0) || 0;

  const { data, error } = await db()
    .from("apple_registrations")
    .select("serial_number, cards(updated_at, programs(updated_at), businesses(updated_at))")
    .eq("device_library_identifier", deviceId)
    .eq("pass_type_identifier", passTypeId);
  if (error) return new Response(null, { status: 500 });
  if (!data?.length) return new Response(null, { status: 404 });

  let latest = since;
  const serialNumbers: string[] = [];
  for (const row of data as Row[]) {
    if (!row.cards) continue;
    const version = Math.max(
      new Date(row.cards.updated_at).getTime(),
      new Date(row.cards.programs?.updated_at ?? 0).getTime(),
      new Date(row.cards.businesses?.updated_at ?? 0).getTime(),
    );
    if (version > since) {
      serialNumbers.push(row.serial_number);
      latest = Math.max(latest, version);
    }
  }
  if (!serialNumbers.length) return new Response(null, { status: 204 });
  return Response.json({ serialNumbers, lastUpdated: String(latest) });
}
