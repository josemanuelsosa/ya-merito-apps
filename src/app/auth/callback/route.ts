// Regreso desde los correos de Supabase Auth (recuperar contraseña).
import { NextResponse } from "next/server";
import { dbAsUser } from "@/server/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/panel";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/panel";

  if (code) {
    const sb = await dbAsUser();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/recuperar?error=enlace", url.origin));
}
