// Secciones de la portada. Componentes de servidor: el HTML llega completo
// y legible aunque el JavaScript no cargue; motion.ts solo le da movimiento.
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { formatMXN, PLAN_ORDER, PLANS, TRIAL_DAYS } from "@/core/plans";
import {
  COUNTER_POINTS,
  FAQ,
  GALLERY,
  HEAT_HOURS,
  HERO_CARD,
  INSIGHT_POINTS,
  SAMPLE_SEGMENTS,
  sampleHeat,
  STORY_STEPS,
  TAPE_WORDS,
  VERSUS,
} from "./data";
import { FakeQr, Glyph, Mark, Notif, Pass, Phone, RoundStamp } from "./pieces";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const v = (o: Record<string, string | number>) => o as Vars;

// ─── Portada ──────────────────────────────────────────────────────────
const TITLE = ["Que", "regresen", "por", "el", "sello", "que", "les", "falta."];

export function Hero() {
  return (
    <section className="ym-hero" data-hero="">
      <div className="ym-hero__ink" aria-hidden="true">
        <RoundStamp text="CLIENTE FRECUENTE · CLIENTE FRECUENTE · " color="#ff7a12" size={170} className="ym-float" style={v({ "--x": "4%", "--y": "70%", "--rot": "-14deg", "--speed": 0.18 })} />
        <RoundStamp text="YA MERITO · YA MERITO · YA MERITO · " color="#17152b" size={128} className="ym-float ym-float--faint" style={v({ "--x": "47%", "--y": "6%", "--rot": "12deg", "--speed": -0.12 })} />
        <RoundStamp text="PREMIO LISTO · PREMIO LISTO · " color="#0e8a5f" size={112} className="ym-float" style={v({ "--x": "88%", "--y": "78%", "--rot": "18deg", "--speed": 0.3 })} />
      </div>

      <div className="ym-wrap ym-hero__grid">
        <div className="ym-hero__copy">
          <p className="ym-kicker">
            <span className="ym-kicker__dot" aria-hidden="true" />
            Tarjeta de sellos para Apple Wallet y Google Wallet
          </p>
          <h1 className="ym-hero__title" aria-label={TITLE.join(" ")}>
            {TITLE.map((w, i) => (
              <Fragment key={i}>
                <span className={`ym-w ${i === TITLE.length - 1 ? "ym-w--hl" : ""}`} style={v({ "--i": i })} aria-hidden="true">
                  {w}
                  {i === TITLE.length - 1 ? (
                    <svg className="ym-w__ring" viewBox="0 0 220 100" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M18 58C14 28 70 10 122 12c58 2 92 20 88 44-4 26-62 38-112 36C46 90 10 78 20 50c6-16 30-26 56-30" />
                    </svg>
                  ) : null}
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className="ym-lead">
            Tus clientes guardan tu tarjeta de sellos en su celular con un QR. Tú sellas con la cámara de tu celular. Y cuando ya merito se ganan su premio,
            su celular les avisa.
          </p>
          <div className="ym-ctas">
            <Link href="/registro" className="ym-btn ym-btn--accent ym-btn--lg">
              Probar {TRIAL_DAYS} días gratis
              <Glyph name="arrow" size={20} />
            </Link>
            <a href="#como-funciona" className="ym-btn ym-btn--ghost ym-btn--lg">
              Ver cómo funciona
            </a>
          </div>
          <ul className="ym-fine">
            <li>Sin tarjeta de crédito</li>
            <li>Lista en 5 minutos</li>
            <li>Tus clientes no descargan nada</li>
          </ul>
        </div>

        <div className="ym-hero__stage">
          <div className="ym-hero__card" data-tilt="">
            <Notif className="ym-hero__notif" title={HERO_CARD.business} text="Nuevo sello ✓ Llevas 6/8" attrs={{ "data-hero-notif": "", role: "status" }} />
            <Pass card={HERO_CARD} qr attrs={{ "data-hero-pass": "" }} />
          </div>
          <button type="button" className="ym-stampbtn" data-hero-btn="" aria-label="Ponerle un sello a Ana">
            <span className="ym-stampbtn__ring" aria-hidden="true" />
            <span className="ym-stampbtn__icon" data-hero-icon="stamp">
              <Glyph name="stamp" size={30} />
            </span>
            <span className="ym-stampbtn__icon" data-hero-icon="gift" hidden>
              <Glyph name="gift" size={30} />
            </span>
            <span data-hero-btn-label="">Sellar</span>
          </button>
          <p className="ym-hero__hint">Tócalo: así sella el cajero y así le llega al cliente.</p>
        </div>
      </div>
    </section>
  );
}

// ─── Cinta de giros ───────────────────────────────────────────────────
export function Tape() {
  const words = [...TAPE_WORDS, ...TAPE_WORDS];
  return (
    <div className="ym-tape">
      <p className="ym-sr">Para {TAPE_WORDS.join(", ").toLowerCase()} y cualquier negocio con clientes que regresan.</p>
      <div className="ym-tape__band" aria-hidden="true">
        <div className="ym-tape__track" data-marquee="">
          {words.map((w, i) => (
            <span key={i} className="ym-tape__word">
              {w}
              <Mark size={34} ink="currentColor" accent="#ffffff" motion={false} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cómo funciona: la tarjeta se llena con el scroll ─────────────────
export function Story() {
  return (
    <section id="como-funciona" className="ym-story" data-story="">
      <div className="ym-story__pin">
        <div className="ym-wrap ym-story__grid">
          <div className="ym-story__copy">
            <div className="ym-story__head">
              <p className="ym-kicker">Cómo funciona</p>
              <h2 className="ym-h2">Así se llena una tarjeta</h2>
            </div>
            <ol className="ym-story__steps">
              {STORY_STEPS.map((s, i) => (
                <li key={s.title} data-step={i} className={i === 0 ? "is-on" : ""}>
                  <span className="ym-story__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="ym-story__stage" data-fit-box="">
            <div className="ym-story__big" aria-hidden="true">
              <span data-story-count="">0</span>
              <small>/8</small>
            </div>
            <div className="ym-fit" data-fit="">
              <Phone label="Ejemplo: el celular de un cliente mientras junta sus sellos" className="ym-story__phone">
                <div className="ym-scene ym-signup" data-scene="0">
                  <div className="ym-signup__brand">
                    <span className="ym-pass__logo ym-signup__logo">E</span>
                    <b>Café La Esquina</b>
                    <span>Junta 8 sellos y llévate un americano gratis</span>
                  </div>
                  <label className="ym-signup__field">
                    <span>Tu nombre</span>
                    <span className="ym-signup__input" data-type="Ana López">
                      Ana López
                    </span>
                  </label>
                  <label className="ym-signup__field">
                    <span>Tu celular</span>
                    <span className="ym-signup__input" data-type="33 1234 5678">
                      33 1234 5678
                    </span>
                  </label>
                  <span className="ym-signup__btn">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 10h18" stroke="#ff7a12" strokeWidth="2.4" />
                    </svg>
                    Agregar a Apple Wallet
                  </span>
                  <span className="ym-signup__fine">Sin app. Tu tarjeta se guarda en tu celular.</span>
                </div>

                <div className="ym-scene ym-walletapp" data-scene="1">
                  <div className="ym-walletapp__top">
                    <b>Wallet</b>
                    <span aria-hidden="true">
                      <Glyph name="plus" size={18} />
                    </span>
                  </div>
                  <div className="ym-walletapp__ghost" aria-hidden="true" />
                  <Pass card={HERO_CARD} stamps={0} qr attrs={{ "data-story-pass": "" }} />
                </div>

                <Notif className="ym-story__notif" title={HERO_CARD.business} text="¡Ya merito! Llevas 7/8, te falta 1 sello" />

                <div className="ym-confetti" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} style={v({ "--a": `${(i * 360) / 18 + (i % 3) * 7}deg`, "--d": `${70 + ((i * 37) % 60)}px`, "--c": ["#ff7a12", "#0e8a5f", "#f6c35b", "#17152b"][i % 4] })} />
                  ))}
                </div>
              </Phone>
            </div>
            <div className="ym-story__rail" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── En el mostrador ──────────────────────────────────────────────────
const POINT_ICONS = ["camera", "shield", "team"] as const;

export function Counter() {
  return (
    <section className="ym-counter" data-inview="">
      <div className="ym-wrap ym-counter__grid">
        <div className="ym-counter__visual">
          <Phone className="ym-phone--dark ym-counter__phone" label="Ejemplo: la pantalla del cajero al sellar">
            <div className="ym-scan">
              <div className="ym-scan__top">
                <span>Sellar</span>
                <span className="ym-scan__loc">Centro</span>
              </div>
              <div className="ym-scan__view">
                <div className="ym-scan__target">
                  <FakeQr size={92} seed={11} />
                </div>
                <span className="ym-scan__corners" aria-hidden="true" />
                <span className="ym-scan__line" aria-hidden="true" />
              </div>
              <p className="ym-scan__help">Apunta al código del cliente</p>
              <div className="ym-scan__sheet">
                <span className="ym-scan__plus">+1 sello</span>
                <b>Ana López</b>
                <span className="ym-scan__dots" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <i key={i} className={i < 7 ? "on" : ""} />
                  ))}
                </span>
                <span className="ym-scan__msg">¡Ya merito! Le falta 1 sello</span>
              </div>
            </div>
          </Phone>
          <span className="ym-counter__badge" aria-hidden="true">
            2 s
          </span>
        </div>
        <div className="ym-counter__copy">
          <p className="ym-kicker">En el mostrador</p>
          <h2 className="ym-h2">Sellar toma dos segundos</h2>
          <p className="ym-p">
            Tu cajero abre Ya Merito en su celular o en la tablet de la caja, apunta al pase del cliente y listo. Lo aprende en un minuto y no necesitas
            comprar nada.
          </p>
          <ul className="ym-points">
            {COUNTER_POINTS.map((p, i) => (
              <li key={p.title} data-reveal="" style={v({ "--i": i })}>
                <span className="ym-points__icon">
                  <Glyph name={POINT_ICONS[i]} size={22} />
                </span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Galería horizontal ───────────────────────────────────────────────
export function Gallery() {
  return (
    <section className="ym-gallery" data-gallery="">
      <div className="ym-gallery__pin">
        <div className="ym-wrap ym-gallery__head">
          <div>
            <p className="ym-kicker">Tu marca, tu tarjeta</p>
            <h2 className="ym-h2">Se ve como tu negocio, no como el nuestro</h2>
          </div>
          <p className="ym-p">Tu logo, tus colores, tu sello y tu premio. Si cambias algo, la tarjeta cambia en el celular de todos tus clientes.</p>
        </div>
        <div className="ym-gallery__viewport">
          <div className="ym-gallery__track" data-gallery-track="">
            {GALLERY.map((c) => (
              <figure key={c.business} className="ym-gallery__item" data-gallery-item="">
                <Pass card={c} />
                <figcaption>
                  <b>{c.category}</b>
                  <span>
                    {c.required} sellos · {c.reward.toLowerCase()}
                  </span>
                </figcaption>
              </figure>
            ))}
            <div className="ym-gallery__end">
              <p>¿Cómo se vería la tuya?</p>
              <Link href="/registro" className="ym-btn ym-btn--accent">
                Diseñar mi tarjeta
                <Glyph name="arrow" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Cartón contra Ya Merito ──────────────────────────────────────────
export function Versus() {
  return (
    <section className="ym-versus" data-progress="">
      <div className="ym-wrap ym-versus__grid">
        <div className="ym-versus__visual" aria-hidden="true">
          <div className="ym-versus__pass">
            <Pass card={HERO_CARD} stamps={6} />
          </div>
          <div className="ym-kraft">
            <span className="ym-kraft__stain" />
            <b>Café La Esquina</b>
            <span className="ym-kraft__sub">Tarjeta de cliente frecuente</span>
            <span className="ym-kraft__holes">
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} className={i < 5 ? "on" : ""} />
              ))}
            </span>
            <span className="ym-kraft__foot">8 sellos = 1 café · No se repone</span>
          </div>
        </div>
        <div className="ym-versus__copy">
          <p className="ym-kicker">Por qué funciona</p>
          <h2 className="ym-h2">Adiós a la tarjeta de cartón</h2>
          <p className="ym-p">La de cartón funciona hasta que se pierde. La de Ya Merito se queda en su celular y les recuerda que regresen.</p>
          <div className="ym-tablewrap">
            <table className="ym-versus__table">
              <thead>
                <tr>
                  <th scope="col">Tarjeta de cartón</th>
                  <th scope="col">Ya Merito</th>
                </tr>
              </thead>
              <tbody>
                {VERSUS.map((r, i) => (
                  <tr key={r.paper} data-reveal="" style={v({ "--i": i })}>
                    <td>
                      <Glyph name="x" size={16} stroke={2.4} />
                      {r.paper}
                    </td>
                    <td>
                      <Glyph name="check" size={16} stroke={2.6} />
                      {r.wallet}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Estudio de mercado ───────────────────────────────────────────────
export function Insights() {
  const heat = sampleHeat();
  const total = SAMPLE_SEGMENTS.reduce((a, s) => a + s.value, 0);
  const hourTag = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
  return (
    <section id="estudio" className="ym-insights" data-progress="">
      <div className="ym-wrap ym-insights__grid">
        <div className="ym-insights__copy">
          <p className="ym-kicker ym-kicker--dark">Estudio de mercado incluido</p>
          <h2 className="ym-h2">Cada sello te dice algo de tus clientes</h2>
          <p className="ym-p">Ya Merito convierte los sellos en un estudio de mercado de tu negocio y te dice qué hacer cada semana para vender más.</p>
          <ul className="ym-ilist">
            {INSIGHT_POINTS.map((p, i) => (
              <li key={p.title} data-reveal="" style={v({ "--i": i })}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="ym-board" aria-label="Ejemplo del estudio de mercado de una cafetería" role="figure">
          <div className="ym-board__head">
            <div>
              <b>Estudio de mercado</b>
              <span>Café La Esquina · últimos 90 días</span>
            </div>
            <span className="ym-chip">Datos de ejemplo</span>
          </div>

          <div className="ym-board__recs">
            <article className="ym-rec">
              <span className="ym-rec__icon">
                <Glyph name="bulb" size={18} />
              </span>
              <div>
                <h3>12 clientes están a 1 sello de su premio</h3>
                <p>Un mensaje de “¡ya merito!” es el empujón más fácil para que regresen esta semana.</p>
                <span className="ym-rec__btn">
                  <Glyph name="chat" size={15} />
                  Mandarles WhatsApp
                </span>
              </div>
            </article>
            <article className="ym-rec ym-rec--warn">
              <span className="ym-rec__icon">
                <Glyph name="alert" size={18} />
              </span>
              <div>
                <h3>Los martes de 4 a 6 pm son tu horario más flojo</h3>
                <p>Anuncia sello doble en ese horario para llenar las horas vacías.</p>
                <span className="ym-rec__btn ym-rec__btn--accent">
                  <Glyph name="share" size={15} />
                  Compartir promoción
                </span>
              </div>
            </article>
          </div>

          <div className="ym-board__block">
            <p className="ym-board__label">Cuándo vienen</p>
            <div className="ym-heat" style={v({ "--cols": HEAT_HOURS.length })}>
              <span />
              {HEAT_HOURS.map((h, i) => (
                <span key={h} className="ym-heat__h">
                  {i % 2 === 0 ? hourTag(h) : ""}
                </span>
              ))}
              {heat.map((row, d) => [
                <span key={`d${d}`} className="ym-heat__d">
                  {["L", "M", "M", "J", "V", "S", "D"][d]}
                </span>,
                ...row.map((val, i) => (
                  <span
                    key={`${d}-${i}`}
                    className={`ym-heat__c ${d === 1 && (i === 8 || i === 9) ? "is-weak" : ""}`}
                    style={v({ "--v": val.toFixed(2), "--d": ((i / HEAT_HOURS.length) * 0.55 + d * 0.03).toFixed(3) })}
                  />
                )),
              ])}
            </div>
          </div>

          <div className="ym-board__block">
            <p className="ym-board__label">Quiénes son tus clientes</p>
            <div className="ym-seg">
              {SAMPLE_SEGMENTS.map((s, i) => (
                <span key={s.id} style={v({ "--w": `${(100 * s.value) / total}%`, "--c": s.color, "--i": i })} />
              ))}
            </div>
            <ul className="ym-seg__legend">
              {SAMPLE_SEGMENTS.map((s) => (
                <li key={s.id}>
                  <i style={{ background: s.color }} />
                  {s.label} <b>{s.value}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Precios ──────────────────────────────────────────────────────────
export function Pricing() {
  return (
    <section id="precios" className="ym-pricing" data-pricing="" data-cycle="monthly">
      <div className="ym-wrap">
        <div className="ym-pricing__head">
          <div>
            <p className="ym-kicker">Precios</p>
            <h2 className="ym-h2">Claros y en pesos</h2>
          </div>
          <p className="ym-p">
            Todos los planes incluyen clientes y sellos ilimitados, Apple Wallet, Google Wallet y tu cartel QR. Empiezas con {TRIAL_DAYS} días del plan Pro sin
            pagar nada.
          </p>
        </div>
        <div className="ym-cycle" role="radiogroup" aria-label="Forma de pago">
          <button type="button" role="radio" aria-checked="true" data-cycle-btn="monthly">
            Mensual
          </button>
          <button type="button" role="radio" aria-checked="false" data-cycle-btn="yearly">
            Anual <span>2 meses gratis</span>
          </button>
        </div>
        <div className="ym-plans">
          {PLAN_ORDER.map((id, i) => {
            const p = PLANS[id];
            const featured = id === "pro";
            return (
              <article key={id} className={`ym-plan ${featured ? "is-featured" : ""}`} data-reveal="" style={v({ "--i": i })}>
                <div className="ym-plan__top">
                  <h3>{p.name}</h3>
                  {featured ? <span className="ym-plan__tag">El más elegido</span> : null}
                </div>
                <p className="ym-plan__tagline">{p.tagline}</p>
                <p className="ym-plan__price">
                  <span data-show="monthly">
                    <b>{formatMXN(p.monthly)}</b> al mes
                  </span>
                  <span data-show="yearly">
                    <b>{formatMXN(p.yearly)}</b> al año
                  </span>
                </p>
                <p className="ym-plan__note">
                  <span data-show="monthly">IVA incluido · cancela cuando quieras</span>
                  <span data-show="yearly">Equivale a {formatMXN(Math.round(p.yearly / 12))} al mes</span>
                </p>
                <ul>
                  {p.highlights.map((h) => (
                    <li key={h}>
                      <Glyph name="check" size={17} stroke={2.6} />
                      {h}
                    </li>
                  ))}
                </ul>
                <Link href={`/registro?plan=${id}`} className={`ym-btn ${featured ? "ym-btn--accent" : "ym-btn--ghost"}`}>
                  Empezar con {p.name}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Preguntas ────────────────────────────────────────────────────────
export function Faq() {
  return (
    <section className="ym-faq">
      <div className="ym-wrap ym-faq__grid">
        <h2 className="ym-h2">Lo que nos preguntan en el mostrador</h2>
        <div className="ym-faq__list">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <span aria-hidden="true">
                  <Glyph name="plus" size={20} />
                </span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Cierre ───────────────────────────────────────────────────────────
export function FinalCta() {
  return (
    <section className="ym-final">
      <div className="ym-wrap">
        <div className="ym-final__card" data-inview="">
          <div className="ym-final__copy">
            <h2>Tu primera tarjeta, hoy mismo.</h2>
            <p>Crea tu cuenta, imprime tu QR y da tu primer sello antes de cerrar.</p>
            <Link href="/registro" className="ym-btn ym-btn--accent ym-btn--lg">
              Crear mi tarjeta gratis
              <Glyph name="arrow" size={20} />
            </Link>
          </div>
          <svg className="ym-final__stamp" viewBox="0 0 340 150" aria-hidden="true">
            <g filter="url(#ym-ink)" fill="none" stroke="currentColor">
              <rect x="8" y="8" width="324" height="134" rx="18" strokeWidth="7" />
              <rect x="22" y="22" width="296" height="106" rx="10" strokeWidth="2.5" />
              <text x="170" y="96" textAnchor="middle" textLength="276" lengthAdjust="spacingAndGlyphs" fill="currentColor" stroke="none" className="ym-final__stampText">
                ¡YA MERITO!
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
