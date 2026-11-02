import { Counter, Faq, FinalCta, Gallery, Hero, Insights, Pricing, Story, Tape, Versus } from "@/features/landing/sections";

/**
 * Portada. La página entera es una tarjeta de sellos: la portada se sella al
 * tocar, "Cómo funciona" se llena con el scroll y el encabezado lleva su
 * propia tarjeta de 8 sellos que se completa al llegar al final.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <Tape />
      <Story />
      <Counter />
      <Gallery />
      <Versus />
      <Insights />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}
