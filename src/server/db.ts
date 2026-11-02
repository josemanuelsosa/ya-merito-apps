import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/server/env";

let admin: SupabaseClient | null = null;

/**
 * Cliente con service_role: se salta RLS.
 * SOLO para escrituras (funciones de 0004) y para rutas sin usuario
 * (web service de Apple, webhooks, cola), siempre después de validar quién llama.
 */
export function db(): SupabaseClient {
  if (!admin) {
    admin = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/**
 * Cliente con la sesión del usuario: respeta RLS.
 * Úsalo para LEER datos del panel: aunque una consulta tenga un error,
 * nunca puede devolver datos de otro negocio.
 */
export async function dbAsUser(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy refresca la sesión.
        }
      },
    },
  });
}
