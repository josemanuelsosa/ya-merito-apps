// PassKit Web Service · Apple manda aquí los errores del iPhone. Útil para depurar.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { logs?: string[] } | null;
  for (const line of (body?.logs ?? []).slice(0, 20)) console.warn("[apple-wallet]", String(line).slice(0, 500));
  return new Response(null, { status: 200 });
}
