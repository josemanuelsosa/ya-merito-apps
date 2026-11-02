import { Wordmark } from "@/ui/brand";
import { ButtonLink } from "@/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-5 px-6">
      <Wordmark size={26} />
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Esta página no existe</h1>
      <p className="text-lg text-ink-2">Puede que el enlace esté incompleto o que el negocio ya no tenga su tarjeta activa.</p>
      <ButtonLink href="/">Ir al inicio</ButtonLink>
    </main>
  );
}
