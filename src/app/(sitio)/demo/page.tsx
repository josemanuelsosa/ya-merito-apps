import type { Metadata } from "next";
import { Demo } from "./demo";

export const metadata: Metadata = {
  title: "Demo",
  description: "Prueba cómo se sella una tarjeta en caja y cómo se actualiza en el celular del cliente.",
};

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">Pruébalo como cajero</h1>
      <p className="mt-2 mb-10 max-w-[44rem] text-lg text-ink-2">
        A la izquierda, la pantalla de caja. A la derecha, el celular de tu cliente. Todo corre en esta página, sin cuenta.
      </p>
      <Demo />
    </main>
  );
}
