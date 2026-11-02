import Link from "next/link";
import { InkFilter, Wordmark } from "./pieces";

const NAV = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#estudio", label: "Estudio de mercado" },
  { href: "/#precios", label: "Precios" },
  { href: "/demo", label: "Demo" },
];

export function SiteHeader() {
  return (
    <header className="ym-header" data-header="">
      <div className="ym-wrap ym-header__in">
        <Link href="/" className="ym-header__logo" aria-label="Ya Merito, inicio">
          <Wordmark size={26} />
        </Link>
        <nav className="ym-header__nav" aria-label="Secciones">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ym-header__end">
          {/* Una tarjeta de 8 sellos que se llena mientras lees la página */}
          <span className="ym-pagecard" data-page-card="" title="Tu tarjeta de esta página" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <Link href="/login" className="ym-header__login">
            Entrar
          </Link>
          <Link href="/registro" className="ym-btn ym-btn--ink ym-btn--sm">
            Prueba gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="ym-footer">
      <div className="ym-wrap ym-footer__in">
        <div className="ym-footer__brand">
          <Wordmark size={30} />
          <p>La tarjeta de sellos de tu negocio, en el celular de tus clientes.</p>
        </div>
        <nav aria-label="Enlaces" className="ym-footer__nav">
          <Link href="/#como-funciona">Cómo funciona</Link>
          <Link href="/#precios">Precios</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/registro">Crear cuenta</Link>
          <Link href="/login">Entrar</Link>
        </nav>
        <p className="ym-footer__made">Hecho en México</p>
      </div>
    </footer>
  );
}

export { InkFilter };
