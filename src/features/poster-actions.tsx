"use client";

import { Copy, Printer } from "lucide-react";
import { Button } from "@/ui/button";
import { useToast } from "@/ui/toast";

export function PosterActions({ url }: { url: string }) {
  const toast = useToast();
  return (
    <>
      <Button
        variant="ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast("Enlace copiado.");
          } catch {
            toast("No se pudo copiar. Selecciona el enlace de abajo.", "error");
          }
        }}
      >
        <Copy size={18} aria-hidden="true" />
        Copiar enlace
      </Button>
      <Button onClick={() => window.print()}>
        <Printer size={18} aria-hidden="true" />
        Imprimir
      </Button>
    </>
  );
}
