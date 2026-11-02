"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChartColumn,
  ChevronsUpDown,
  CreditCard,
  House,
  Lightbulb,
  LogOut,
  Menu,
  Palette,
  QrCode,
  Stamp,
  Store,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOutAction, switchBusinessAction } from "@/server/actions/account";
import { BrandMark, Wordmark } from "@/ui/brand";

export interface ShellNav {
  design: boolean;
  reports: boolean;
  team: boolean;
  billing: boolean;
  business: boolean;
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  show: boolean;
}

export function PanelShell({
  businessName,
  roleLabel,
  email,
  nav,
  businesses,
  activeBusinessId,
  locationName,
  banner,
  children,
}: {
  businessName: string;
  roleLabel: string;
  email: string | null;
  nav: ShellNav;
  businesses: { id: string; name: string }[];
  activeBusinessId: string;
  locationName: string | null;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);

  const items: Item[] = [
    { href: "/panel", label: "Inicio", icon: House, show: true },
    { href: "/panel/sellar", label: "Sellar", icon: Stamp, show: true },
    { href: "/panel/clientes", label: "Clientes", icon: Users, show: true },
    { href: "/panel/estudio", label: "Estudio", icon: Lightbulb, show: nav.reports },
    { href: "/panel/tarjeta", label: "Tarjeta", icon: Palette, show: nav.design },
    { href: "/panel/qr", label: "Cartel QR", icon: QrCode, show: true },
    { href: "/panel/reportes", label: "Reportes", icon: ChartColumn, show: nav.reports },
    { href: "/panel/equipo", label: "Equipo", icon: UsersRound, show: nav.team },
    { href: "/panel/negocio", label: "Negocio", icon: Store, show: nav.business },
    { href: "/panel/plan", label: "Plan", icon: CreditCard, show: nav.billing },
  ].filter((i) => i.show);

  const active = (href: string) => (href === "/panel" ? path === "/panel" : path.startsWith(href));
  const focusMode = path.startsWith("/panel/sellar");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-line px-4 py-5 lg:flex">
        <Link href="/panel" className="px-2" aria-label="Inicio del panel">
          <Wordmark size={24} />
        </Link>
        <BusinessSwitcher businesses={businesses} activeId={activeBusinessId} name={businessName} sub={locationName ?? roleLabel} />
        <nav className="mt-4 grid gap-0.5" aria-label="Secciones">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                active(href) ? "bg-mist text-ink" : "text-ink-2 hover:bg-mist/60 hover:text-ink"
              }`}
            >
              <Icon size={19} aria-hidden="true" className={active(href) && href === "/panel/sellar" ? "text-cempa-ink" : undefined} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate px-3 text-sm text-ink-2" title={email ?? undefined}>
            {email}
          </p>
          <form action={signOutAction}>
            <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-ink-2 hover:bg-mist hover:text-ink">
              <LogOut size={19} aria-hidden="true" />
              Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior (celular) */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <Link href="/panel" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={26} motion={false} />
            <span className="min-w-0">
              <span className="block truncate font-display text-[17px] leading-tight font-bold">{businessName}</span>
              <span className="block truncate text-xs text-ink-2">{locationName ?? roleLabel}</span>
            </span>
          </Link>
        </header>

        {banner}
        <main className={`mx-auto w-full px-4 pt-6 pb-32 sm:px-6 lg:pb-12 ${focusMode ? "max-w-xl" : "max-w-[1080px] lg:px-10 lg:pt-10"}`}>{children}</main>
      </div>

      {/* Barra inferior (celular) con el botón de sello al centro */}
      <nav
        aria-label="Secciones"
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          <TabLink href="/panel" label="Inicio" icon={House} active={active("/panel")} />
          <TabLink href="/panel/clientes" label="Clientes" icon={Users} active={active("/panel/clientes")} />
          <Link href="/panel/sellar" className="flex flex-col items-center pb-2" aria-current={active("/panel/sellar") ? "page" : undefined}>
            <span className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-cempa text-ink shadow-[0_10px_24px_-10px_rgb(23_21_43/0.6)] ring-4 ring-paper">
              <Stamp size={26} aria-hidden="true" />
            </span>
            <span className="mt-1 text-[11px] font-semibold">Sellar</span>
          </Link>
          <TabLink href="/panel/qr" label="Cartel QR" icon={QrCode} active={active("/panel/qr")} />
          <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-ink-2">
            <Menu size={22} aria-hidden="true" />
            Más
          </button>
        </div>
      </nav>

      {more ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-ink/30" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-rise rounded-t-[28px] bg-paper px-4 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-mist-2" aria-hidden="true" />
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="font-display text-lg font-bold">{businessName}</span>
              <button type="button" onClick={() => setMore(false)} className="rounded-full p-2 text-ink-2 hover:bg-mist" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items
                .filter((i) => !["/panel", "/panel/sellar", "/panel/clientes", "/panel/qr"].includes(i.href))
                .map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-2xl bg-mist px-2 py-4 text-sm font-semibold">
                    <Icon size={22} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
            </div>
            {businesses.length > 1 ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="px-2 pb-2 text-sm text-ink-2">Cambiar de negocio</p>
                {businesses
                  .filter((b) => b.id !== activeBusinessId)
                  .map((b) => (
                    <form key={b.id} action={switchBusinessAction.bind(null, b.id)}>
                      <button className="w-full rounded-xl px-3 py-2.5 text-left font-semibold hover:bg-mist">{b.name}</button>
                    </form>
                  ))}
              </div>
            ) : null}
            <form action={signOutAction} className="mt-3 border-t border-line pt-3">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-ink-2 hover:bg-mist">
                <LogOut size={20} aria-hidden="true" />
                Salir {email ? <span className="truncate text-sm text-ink-3">· {email}</span> : null}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active ? "text-ink" : "text-ink-2"}`}>
      <Icon size={22} aria-hidden="true" />
      {label}
    </Link>
  );
}

function BusinessSwitcher({ businesses, activeId, name, sub }: { businesses: { id: string; name: string }[]; activeId: string; name: string; sub: string }) {
  const [open, setOpen] = useState(false);
  const canSwitch = businesses.length > 1;
  return (
    <div className="relative mt-6">
      <button
        type="button"
        disabled={!canSwitch}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left enabled:hover:bg-mist"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink font-display font-bold text-paper">{name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block truncate text-sm text-ink-2">{sub}</span>
        </span>
        {canSwitch ? <ChevronsUpDown size={16} className="text-ink-3" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-xl bg-paper p-1 shadow-[var(--shadow-float)] ring-1 ring-line">
          {businesses
            .filter((b) => b.id !== activeId)
            .map((b) => (
              <form key={b.id} action={switchBusinessAction.bind(null, b.id)}>
                <button className="w-full rounded-lg px-3 py-2 text-left text-[15px] hover:bg-mist">{b.name}</button>
              </form>
            ))}
        </div>
      ) : null}
    </div>
  );
}
