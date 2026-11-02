import type { Metadata } from "next";
import { ResetForm } from "@/features/auth-forms";
import { Notice } from "@/ui/form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Recupera tu acceso</h1>
      <p className="mt-2 mb-8 text-ink-2">Te mandamos un enlace a tu correo para elegir una nueva contraseña.</p>
      {error ? (
        <div className="mb-5">
          <Notice tone="error">Ese enlace ya venció o ya se usó. Pide uno nuevo.</Notice>
        </div>
      ) : null}
      <ResetForm />
    </>
  );
}
