import type { Metadata } from "next";
import { SignInForm } from "@/features/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Entra a tu negocio</h1>
      <p className="mt-2 mb-8 text-ink-2">Para sellar tarjetas, ver a tus clientes y cambiar tu tarjeta.</p>
      <SignInForm next={next} />
    </>
  );
}
