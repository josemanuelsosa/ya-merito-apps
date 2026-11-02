import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Search, Users } from "lucide-react";
import { CAMPAIGNS, campaignMessage, isCampaign } from "@/core/insights";
import { formatMxPhone, maskPhone, whatsappLink } from "@/core/phone";
import { timeAgo } from "@/core/text";
import { can, requireStaffPage } from "@/server/auth/session";
import { appUrl } from "@/server/env";
import { listCustomers, type CustomerFilter } from "@/server/services/customers";
import { Avatar, Empty, PageHeader, StampDots } from "@/ui/bits";
import { ButtonLink } from "@/ui/button";

export const metadata: Metadata = { title: "Clientes" };

const FILTERS: { id: CustomerFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "premio", label: "Premio listo" },
  { id: "casi", label: "A 1 sello" },
  { id: "nuevos", label: "Nuevos" },
  { id: "riesgo", label: "En riesgo" },
  { id: "una-visita", label: "Vinieron una vez" },
  { id: "perdidos", label: "Perdidos" },
];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; p?: string }> }) {
  const ctx = await requireStaffPage("customers.view");
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.id === sp.filtro)?.id ?? "todos") as CustomerFilter;
  const page = Math.max(0, Number(sp.p ?? 0) || 0);
  const { rows, total, pages } = await listCustomers(ctx, { q: sp.q, filter, page });
  // Los cajeros ven solo los últimos 4 dígitos; dueños y gerentes, el número completo y WhatsApp
  const showPhone = can(ctx, "reports");
  const campaign = showPhone && isCampaign(filter) ? filter : null;
  const base = appUrl();
  const vars = (c: (typeof rows)[number]) => ({
    name: c.name,
    business: ctx.business.name,
    reward: ctx.program.reward_description,
    stamps: c.stamps,
    required: c.required,
    cardUrl: `${base}/c/${c.serial}`,
  });

  const href = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: sp.q, filtro: filter === "todos" ? undefined : filter, p: page || undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v !== undefined && v !== "" && params.set(k, String(v)));
    const qs = params.toString();
    return `/panel/clientes${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Clientes" description={`${total} ${total === 1 ? "cliente" : "clientes"}${filter !== "todos" ? " en esta lista" : " con tarjeta"}.`} />

      <form action="/panel/clientes" className="mb-4 flex gap-2">
        {filter !== "todos" ? <input type="hidden" name="filtro" value={filter} /> : null}
        <label htmlFor="q" className="sr-only">
          Buscar por nombre o celular
        </label>
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            id="q"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por nombre o celular"
            className="h-12 w-full rounded-full border-[1.5px] border-line bg-paper pr-4 pl-11 text-[16px] outline-none focus:border-ink"
          />
        </div>
      </form>

      <nav aria-label="Listas" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href({ filtro: f.id === "todos" ? undefined : f.id, p: undefined })}
            aria-current={f.id === filter ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${f.id === filter ? "bg-ink text-paper" : "bg-mist text-ink-2 hover:text-ink"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {campaign && rows.length ? (
        <section aria-label="Mensaje para esta lista" className="mb-6 rounded-[22px] bg-cempa-wash p-5">
          <p className="font-semibold">{CAMPAIGNS[campaign].description}. Escríbeles por WhatsApp:</p>
          <p className="mt-2 rounded-xl bg-paper px-4 py-3 text-[15px] text-ink-2">“{campaignMessage(campaign, vars(rows[0]))}”</p>
          <p className="mt-2 text-sm text-ink-2">Cada botón abre WhatsApp con el mensaje listo para esa persona. Envíalo y regresa por el siguiente.</p>
        </section>
      ) : null}

      {rows.length === 0 ? (
        sp.q || filter !== "todos" ? (
          <Empty icon={<Search size={22} />} title={sp.q ? "Nadie coincide con esa búsqueda" : "Nadie en esta lista por ahora"}>
            {sp.q ? "Prueba con otro nombre, con los últimos 4 dígitos del celular o quita el filtro." : "Buena señal. Revisa otra lista o vuelve en unos días."}
          </Empty>
        ) : (
          <Empty icon={<Users size={22} />} title="Todavía no tienes clientes" action={<ButtonLink href="/panel/qr" variant="primary">Ver mi cartel QR</ButtonLink>}>
            Tus clientes aparecen aquí cuando escanean tu cartel y sacan su tarjeta.
          </Empty>
        )
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Link href={`/panel/clientes/${c.id}`} className="-mx-2 flex min-w-0 flex-1 items-center gap-4 rounded-xl px-2 py-3.5 hover:bg-mist/60">
                <Avatar name={c.name} tone={c.complete ? "agave" : "mist"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="truncate text-sm text-ink-2">
                    {showPhone ? formatMxPhone(c.phone) : maskPhone(c.phone)} · {c.lastVisitAt ? `vino ${timeAgo(c.lastVisitAt)}` : "sin visitas"}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <StampDots stamps={c.stamps} required={c.required} size={10} />
                  <p className={`tabular mt-1 text-sm ${c.complete ? "font-semibold text-agave" : "text-ink-2"}`}>
                    {c.complete ? "Premio listo" : `${c.stamps}/${c.required}`}
                  </p>
                </div>
                <p className={`tabular text-sm font-semibold sm:hidden ${c.complete ? "text-agave" : "text-ink-2"}`}>
                  {c.stamps}/{c.required}
                </p>
              </Link>
              {campaign ? (
                <ButtonLink
                  href={whatsappLink(c.phone, campaignMessage(campaign, vars(c)))}
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  target="_blank"
                  rel="noopener"
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">WhatsApp</span>
                  <span className="sr-only sm:hidden">WhatsApp a {c.name}</span>
                </ButtonLink>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-between">
          {page > 0 ? <ButtonLink href={href({ p: page - 1 || undefined })} variant="ghost" size="sm">Anteriores</ButtonLink> : <span />}
          <span className="tabular text-sm text-ink-2">
            Página {page + 1} de {pages}
          </span>
          {page + 1 < pages ? <ButtonLink href={href({ p: page + 1 })} variant="ghost" size="sm">Siguientes</ButtonLink> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
