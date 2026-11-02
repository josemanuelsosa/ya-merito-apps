// PassKit Web Service · registrar / dar de baja un iPhone para un pase.
import { db } from "@/server/db";
import { checkAppleAuth } from "@/server/integrations/apple/pass";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ deviceId: string; passTypeId: string; serial: string }> };

async function authorized(request: Request, passTypeId: string, serial: string) {
  if (passTypeId !== process.env.APPLE_PASS_TYPE_ID) return false;
  const { data } = await db().from("cards").select("auth_token").eq("serial_number", serial).maybeSingle();
  return Boolean(data && checkAppleAuth(request, (data as { auth_token: string }).auth_token));
}

export async function POST(request: Request, { params }: Ctx) {
  const { deviceId, passTypeId, serial } = await params;
  if (!(await authorized(request, passTypeId, serial))) return new Response(null, { status: 401 });

  const body = (await request.json().catch(() => null)) as { pushToken?: string } | null;
  if (!body?.pushToken) return new Response(null, { status: 400 });

  await db().from("apple_devices").upsert({ device_library_identifier: deviceId, push_token: body.pushToken });
  const { error } = await db()
    .from("apple_registrations")
    .insert({ device_library_identifier: deviceId, pass_type_identifier: passTypeId, serial_number: serial });
  // 23505 = ya estaba registrado
  if (error) return new Response(null, { status: error.code === "23505" ? 200 : 500 });
  return new Response(null, { status: 201 });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { deviceId, passTypeId, serial } = await params;
  if (!(await authorized(request, passTypeId, serial))) return new Response(null, { status: 401 });

  await db()
    .from("apple_registrations")
    .delete()
    .match({ device_library_identifier: deviceId, pass_type_identifier: passTypeId, serial_number: serial });
  const { count } = await db()
    .from("apple_registrations")
    .select("*", { count: "exact", head: true })
    .eq("device_library_identifier", deviceId);
  if (!count) await db().from("apple_devices").delete().eq("device_library_identifier", deviceId);
  return new Response(null, { status: 200 });
}
