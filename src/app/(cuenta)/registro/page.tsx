import type { Metadata } from "next";
import { CreateBusinessForm, SignUpForm } from "@/features/auth-forms";
import { getUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const { paso } = await searchParams;
  const user = paso === "negocio" ? await getUser() : null;

  if (user) {
    const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
    return (
      <>
        <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Abre tu negocio</h1>
        <p className="mt-2 mb-8 text-ink-2">Tu cuenta aún no tiene un negocio. Créalo y empieza con 14 días del plan Pro.</p>
        <CreateBusinessForm defaultName={name} />
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Tu tarjeta de sellos, en 5 minutos</h1>
      <p className="mt-2 mb-8 text-ink-2">Te sugerimos un premio según tu giro. Lo cambias cuando quieras.</p>
      <SignUpForm />
    </>
  );
}
