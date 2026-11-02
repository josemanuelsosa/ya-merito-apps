/**
 * Motor de movimiento del sitio público. Sin dependencias: un solo ciclo de
 * requestAnimationFrame que lee el scroll y escribe clases y variables CSS.
 * Todo el dibujo lo hace landing.css, así que el HTML se ve completo aunque
 * este archivo no cargue, y con "reducir movimiento" no hay nada pegajoso.
 */
import { appleChangeMessage, cardStatus } from "@/core/loyalty";
import { STORY_TIMING } from "./data";

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

/** Cambia los sellos de un pase dibujado con <Pass>. */
export function setPassStamps(pass: HTMLElement, stamps: number) {
  const required = Number(pass.dataset.required) || 8;
  const prev = Number(pass.dataset.stamps) || 0;
  if (prev === stamps) return;
  const s = cardStatus({ stamps, required, redemptions: 0 });
  pass.dataset.stamps = String(stamps);
  pass.classList.toggle("is-complete", s.complete);
  pass.querySelectorAll<HTMLElement>("[data-slot]").forEach((slot) => {
    const i = Number(slot.dataset.slot);
    const on = i < stamps;
    if (on !== slot.classList.contains("on")) {
      slot.classList.toggle("on", on);
      slot.classList.toggle("just", on && i >= prev);
    }
  });
  const set = (sel: string, text: string) => {
    const el = pass.querySelector(sel);
    if (el) el.textContent = text;
  };
  set("[data-pass-count]", s.counter);
  set("[data-pass-left]", s.remainingLabel);
  set("[data-pass-title]", s.complete ? "¡PREMIO LISTO!" : "TU PREMIO");
  const strip = pass.querySelector("[data-pass-strip]");
  strip?.setAttribute("aria-label", `${stamps} de ${required} sellos`);
}

function notifText(stamps: number, required: number, redemptions = 0) {
  return appleChangeMessage({ stamps, required, redemptions }).replace("%@", `${stamps}/${required}`);
}

/** Reinicia una animación CSS quitando y poniendo la clase. */
function replay(el: Element, cls: string) {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

export function initSiteMotion(root: HTMLElement): () => void {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (!win) return () => {};
  const html = doc.documentElement;
  html.classList.add("ym-js");
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) html.classList.add("ym-reduce");

  const offs: (() => void)[] = [];
  const listen = (t: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, opts);
    offs.push(() => t.removeEventListener(type, fn, opts));
  };
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T & HTMLElement>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T & HTMLElement>(sel));

  // ─── Aparecer al entrar a la pantalla ───────────────────────────────
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (el.hasAttribute("data-inview")) el.classList.toggle("in", e.isIntersecting);
        else if (e.isIntersecting) {
          el.classList.add("in");
          io.unobserve(el);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
  );
  $$("[data-reveal], [data-inview]").forEach((el) => io.observe(el));
  offs.push(() => io.disconnect());

  // ─── Portada: el pase se sella al tocar ─────────────────────────────
  const heroPass = $("[data-hero-pass]");
  const heroBtn = $<HTMLButtonElement>("[data-hero-btn]");
  const heroNotif = $("[data-hero-notif]");
  if (heroPass && heroBtn) {
    let redemptions = 0;
    const label = heroBtn.querySelector("[data-hero-btn-label]");
    const icons = heroBtn.querySelectorAll<HTMLElement>("[data-hero-icon]");
    const required = Number(heroPass.dataset.required) || 8;
    listen(heroBtn, "click", () => {
      const now = Number(heroPass.dataset.stamps) || 0;
      let next: number;
      if (now >= required) {
        next = 0;
        redemptions += 1;
      } else next = now + 1;
      setPassStamps(heroPass, next);
      const complete = next >= required;
      if (label) label.textContent = complete ? "Canjear" : "Sellar";
      heroBtn.classList.toggle("is-complete", complete);
      heroBtn.setAttribute("aria-label", complete ? "Canjear el premio de Ana" : "Ponerle un sello a Ana");
      icons.forEach((i) => (i.hidden = (i.dataset.heroIcon === "gift") !== complete));
      if (heroNotif) {
        const t = heroNotif.querySelector("[data-notif-text]");
        if (t) t.textContent = notifText(next, required, redemptions);
        replay(heroNotif, "is-new");
      }
      replay(heroBtn, "is-hit");
    });
  }

  // Inclinación del pase con el puntero (solo con mouse)
  const tilt = $("[data-tilt]");
  if (tilt && !reduce && win.matchMedia("(pointer: fine)").matches) {
    const zone = tilt.parentElement ?? tilt;
    listen(zone, "pointermove", ((e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
      tilt.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    }) as EventListener);
    listen(zone, "pointerleave", () => {
      tilt.style.setProperty("--ry", "0deg");
      tilt.style.setProperty("--rx", "0deg");
    });
  }

  // ─── Precios: mensual o anual ───────────────────────────────────────
  const pricing = $("[data-pricing]");
  if (pricing) {
    const btns = Array.from(pricing.querySelectorAll<HTMLButtonElement>("[data-cycle-btn]"));
    const choose = (cycle: string, focus = false) => {
      pricing.dataset.cycle = cycle;
      btns.forEach((b) => {
        const on = b.dataset.cycleBtn === cycle;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      pricing.querySelectorAll(".ym-plan__price").forEach((el) => replay(el, "is-swap"));
    };
    btns.forEach((b) => {
      listen(b, "click", () => choose(b.dataset.cycleBtn ?? "monthly"));
      listen(b, "keydown", ((e: KeyboardEvent) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = btns.indexOf(b);
        const next = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
        choose(next.dataset.cycleBtn ?? "monthly", true);
      }) as EventListener);
    });
    btns.forEach((b) => (b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1));
  }

  // ─── Historia: la tarjeta se llena con el scroll ────────────────────
  const story = $("[data-story]");
  const storyPass = $("[data-story-pass]");
  const storyCount = $("[data-story-count]");
  const steps = $$("[data-step]");
  const storyNotif = story?.querySelector<HTMLElement>(".ym-story__notif") ?? null;
  const typed = story ? Array.from(story.querySelectorAll<HTMLElement>("[data-type]")) : [];
  const fitBox = $("[data-fit-box]");
  const fit = $("[data-fit]");
  let storyStep = -1;
  let storyStamps = -1;
  let storyTyped = "";

  function renderStory(p: number) {
    if (!story || !storyPass) return;
    let step = 0;
    STORY_TIMING.steps.forEach((t, i) => p >= t && (step = i));
    const stamps = STORY_TIMING.stamps.filter((t) => p >= t).length;

    // El cliente escribe su nombre y su celular
    const tName = clamp((p - 0.015) / 0.045);
    const tPhone = clamp((p - 0.065) / 0.04);
    const key = `${tName.toFixed(2)}|${tPhone.toFixed(2)}`;
    if (key !== storyTyped && typed.length === 2) {
      storyTyped = key;
      [tName, tPhone].forEach((t, i) => {
        const full = typed[i].dataset.type ?? "";
        typed[i].textContent = full.slice(0, Math.round(full.length * t));
        typed[i].classList.toggle("is-typing", t > 0 && t < 1);
      });
      story.classList.toggle("is-pressed", p >= 0.105);
    }

    if (step !== storyStep) {
      storyStep = step;
      story.dataset.stage = String(step);
      steps.forEach((li, i) => li.classList.toggle("is-on", i === step));
    }
    if (stamps !== storyStamps) {
      const up = stamps > storyStamps && storyStamps >= 0;
      storyStamps = stamps;
      setPassStamps(storyPass, stamps);
      if (storyCount) {
        storyCount.textContent = String(stamps);
        if (up) replay(storyCount, "is-bump");
      }
      if (storyNotif && stamps >= 7) {
        const t = storyNotif.querySelector("[data-notif-text]");
        if (t) t.textContent = notifText(stamps, 8);
        if (up) replay(storyNotif, "is-new");
      }
      story.classList.toggle("has-notif", stamps >= 7);
      story.classList.toggle("is-complete", stamps >= 8);
    }
  }

  function fitPhone() {
    if (!fitBox || !fit) return;
    const big = fitBox.querySelector<HTMLElement>(".ym-story__rail");
    const h = fitBox.clientHeight - (big?.offsetHeight ?? 0) - 18;
    const w = fitBox.clientWidth;
    const s = clamp(Math.min(h / 640, w / 300), 0.5, 1.05);
    fit.style.setProperty("--s", s.toFixed(3));
  }

  // ─── Galería horizontal ─────────────────────────────────────────────
  const gallery = $("[data-gallery]");
  const track = $("[data-gallery-track]");
  const items = $$("[data-gallery-item]");
  let galleryDist = 0;
  let itemCenters: number[] = [];

  function measureGallery(vh: number) {
    if (!gallery || !track) return;
    const viewport = track.parentElement as HTMLElement;
    track.style.transform = "";
    galleryDist = Math.max(0, track.scrollWidth - viewport.clientWidth);
    gallery.style.setProperty("--gallery-h", `${Math.round(galleryDist + vh)}px`);
    gallery.classList.toggle("is-pinned", galleryDist > 40);
    const base = viewport.getBoundingClientRect().left;
    itemCenters = items.map((it) => {
      const r = it.getBoundingClientRect();
      return r.left - base + r.width / 2;
    });
  }

  // ─── Cinta que corre con el scroll ──────────────────────────────────
  const marquee = $("[data-marquee]");
  let marqueeHalf = 0;
  let marqueeX = 0;
  let marqueeOn = false;
  let dir = 1;
  let velocity = 0;
  if (marquee && !reduce) {
    const mio = new IntersectionObserver(([e]) => {
      marqueeOn = e.isIntersecting;
      if (marqueeOn) kick();
    });
    mio.observe(marquee);
    offs.push(() => mio.disconnect());
  }

  // ─── Ciclo principal ────────────────────────────────────────────────
  const floats = $$(".ym-float");
  const progressEls = $$("[data-progress]");
  const pageCard = $("[data-page-card]");
  const pageDots = pageCard ? Array.from(pageCard.children) as HTMLElement[] : [];
  const header = $("[data-header]");
  const hero = $("[data-hero]");

  let vh = win.innerHeight;
  let lastY = win.scrollY;
  let dirty = true;
  let raf = 0;
  let lastPageDots = -1;

  function measure() {
    vh = win!.innerHeight;
    if (!reduce) measureGallery(vh);
    marqueeHalf = marquee ? marquee.scrollWidth / 2 : 0;
    fitPhone();
    dirty = true;
    kick();
  }

  function frame() {
    raf = 0;
    const y = win!.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (dy !== 0) dir = dy > 0 ? 1 : -1;
    velocity += (dy - velocity) * 0.18;

    if (dirty || dy !== 0) {
      dirty = false;
      header?.classList.toggle("is-scrolled", y > 8);

      // Tarjeta de la página: un sello por cada octavo leído
      const max = Math.max(1, doc.documentElement.scrollHeight - vh);
      const filled = Math.min(8, Math.floor((y / max) * 8 + 0.02));
      if (filled !== lastPageDots) {
        lastPageDots = filled;
        pageDots.forEach((d, i) => d.classList.toggle("on", i < filled));
        pageCard?.classList.toggle("is-complete", filled >= 8);
      }

      if (!reduce) {
        if (hero && y < hero.offsetHeight + 200) {
          floats.forEach((f) => f.style.setProperty("--py", `${(y * Number(f.style.getPropertyValue("--speed") || 0)).toFixed(1)}px`));
        }

        if (story) {
          const r = story.getBoundingClientRect();
          if (r.bottom > -vh && r.top < vh * 2) {
            const p = clamp(-r.top / Math.max(1, r.height - vh));
            story.style.setProperty("--p", p.toFixed(4));
            renderStory(p);
          }
        }

        if (gallery && track && galleryDist > 40) {
          const r = gallery.getBoundingClientRect();
          if (r.bottom > 0 && r.top < vh) {
            const p = clamp(-r.top / Math.max(1, r.height - vh));
            const x = p * galleryDist;
            track.style.transform = `translate3d(${(-x).toFixed(1)}px,0,0)`;
            const viewportW = (track.parentElement as HTMLElement).clientWidth;
            items.forEach((it, i) => {
              const c = clamp((itemCenters[i] - x - viewportW / 2) / viewportW, -1, 1);
              it.style.setProperty("--k", c.toFixed(3));
            });
          }
        }

        for (const el of progressEls) {
          const r = el.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) continue;
          el.style.setProperty("--p", clamp((vh - r.top) / (vh + r.height)).toFixed(4));
        }
      }
    }

    if (marquee && marqueeOn && marqueeHalf > 0) {
      const speed = 0.55 + Math.min(14, Math.abs(velocity) * 0.45);
      marqueeX = (marqueeX - speed * dir) % marqueeHalf;
      if (marqueeX > 0) marqueeX -= marqueeHalf;
      marquee.style.transform = `translate3d(${marqueeX.toFixed(1)}px,0,0)`;
      marquee.parentElement?.style.setProperty("--skew", `${clamp(velocity * -0.12, -5, 5).toFixed(2)}deg`);
    }

    if (marqueeOn || Math.abs(velocity) > 0.05 || dirty) kick();
  }

  function kick() {
    if (!raf) raf = win!.requestAnimationFrame(frame);
  }

  listen(win, "scroll", () => {
    dirty = true;
    kick();
  }, { passive: true });
  let resizeTimer = 0;
  listen(win, "resize", () => {
    win!.clearTimeout(resizeTimer);
    resizeTimer = win!.setTimeout(measure, 120);
  });
  // Las fuentes cambian medidas: medir de nuevo cuando terminen de cargar
  doc.fonts?.ready.then(() => measure()).catch(() => {});

  if (reduce && story && storyPass) {
    // Sin movimiento: la historia se muestra en su momento clave
    story.dataset.stage = "3";
    story.classList.add("has-notif");
    setPassStamps(storyPass, 7);
    if (storyCount) storyCount.textContent = "7";
    steps.forEach((li) => li.classList.add("is-on"));
  }

  measure();
  frame();

  return () => {
    offs.forEach((f) => f());
    if (raf) win.cancelAnimationFrame(raf);
    win.clearTimeout(resizeTimer);
    html.classList.remove("ym-js", "ym-reduce");
  };
}
