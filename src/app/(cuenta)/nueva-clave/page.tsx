import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/features/auth-forms";
import { getUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  if (!(await getUser())) redirect("/recuperar?error=enlace");
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Elige tu nueva contraseña</h1>
      <p className="mt-2 mb-8 text-ink-2">Después entrarás directo a tu panel.</p>
      <NewPasswordForm />
    </>
  );
}
