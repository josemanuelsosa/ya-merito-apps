import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/server/services/enrollment";
import { JoinForm } from "@/features/join-form";
import { BrandMark } from "@/ui/brand";
import { Notice } from "@/ui/form";
import { WalletPass, designFromRows } from "@/ui/wallet-pass";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pub = await getPublicBusiness((await params).slug);
  return pub
    ? {
        title: `Tarjeta de ${pub.business.name}`,
        description: `Junta ${pub.program.stamps_required} sellos y llévate ${pub.program.reward_description}.`,
      }
    : { title: "Negocio no encontrado" };
}

export default async function JoinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { s } = await searchParams;
  const pub = await getPublicBusiness(slug, s);
  if (!pub) notFound();
  const { business, program, location } = pub;

  return (
    <main className="min-h-dvh" style={{ background: `linear-gradient(180deg, ${program.background_color} 0 340px, var(--color-paper) 340px)` }}>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-10 pb-12">
        <p className="text-[15px] font-semibold" style={{ color: program.label_color }}>
          {business.name}
          {location ? `, ${location.name}` : ""}
        </p>
        <h1 className="mt-2 mb-7 text-center font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.025em]" style={{ color: program.foreground_color }}>
          Junta {program.stamps_required} sellos y llévate {program.reward_description.charAt(0).toLowerCase() + program.reward_description.slice(1)}
        </h1>

        <WalletPass design={designFromRows(program, business)} stamps={0} customerName="Tú" />

        <div className="mt-8 w-full">
          {pub.acceptingCustomers ? (
            <JoinForm slug={slug} locationId={location?.id ?? null} />
          ) : (
            <Notice tone="warn">Este negocio pausó su tarjeta digital por ahora. Pregunta en caja.</Notice>
          )}
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-ink-3">
          <BrandMark size={14} motion={false} />
          Tarjeta digital por Ya Merito
        </p>
      </div>
    </main>
  );
}
