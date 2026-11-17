"use client";

import { useEffect, useRef, useState } from "react";

// Carrusel de "Cómo vendemos tu propiedad": un paso por tarjeta, con una foto real de la cartera, el dibujo
// del paso, lo que hace el corredor y la tecnología que lo apoya. Funciona con scroll nativo y con las flechas.

export interface ProcessStep {
  title: string;
  tasks: string[];
  tech: string;
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Drawing({ title }: { title: string }) {
  switch (title) {
    case "Valorización":
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
          <path {...s} d="M14 44 40 22l26 22M20 39v27h40V39" />
          <path {...s} d="M34 66V52h12v14" />
          <path {...s} d="M76 66V54M88 66V44M100 66V32M112 66V24" strokeWidth={5} />
          <path {...s} d="M74 46l12-8 12 6 14-16" />
        </svg>
      );
    case "Ficha y fotos":
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
          <rect {...s} x="14" y="24" width="50" height="36" rx="5" />
          <circle {...s} cx="39" cy="42" r="10" />
          <path {...s} d="M28 24l4-7h14l4 7" />
          <rect {...s} x="74" y="16" width="34" height="48" rx="3" />
          <path {...s} d="M81 27h20M81 35h20M81 43h14M81 51h17" />
        </svg>
      );
    case "Difusión":
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
          <rect {...s} x="44" y="12" width="32" height="56" rx="6" />
          <path {...s} d="M54 20h12M56 60h8" />
          <rect {...s} x="50" y="26" width="20" height="16" rx="2" />
          <path {...s} d="M36 30c-6 6-6 14 0 20M28 24c-10 10-10 22 0 32M84 30c6 6 6 14 0 20M92 24c10 10 10 22 0 32" />
        </svg>
      );
    case "Atención de interesados":
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
          <path {...s} d="M14 20h52a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H34l-12 10V50h-8a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6Z" />
          <path {...s} d="M22 31h36M22 39h24" />
          <path {...s} d="M82 34h26a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-4v8l-10-8H82a5 5 0 0 1-5-5V39a5 5 0 0 1 5-5Z" />
          <path {...s} d="M86 46l5 4 9-9" />
        </svg>
      );
    case "Visitas y oferta":
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
          <rect {...s} x="12" y="18" width="48" height="44" rx="4" />
          <path {...s} d="M12 30h48M24 12v12M48 12v12" />
          <path {...s} d="M22 42h6M34 42h6M46 42h6M22 52h6M34 52h6" />
          <circle {...s} cx="84" cy="40" r="10" />
          <path {...s} d="M94 40h20M108 40v8M114 40v6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden>
          <path {...s} d="M24 10h36l12 12v48H24Z" />
          <path {...s} d="M60 10v12h12M32 34h30M32 42h30M32 50h18" />
          <circle {...s} cx="88" cy="52" r="14" />
          <path {...s} d="M81 52l5 5 9-10" />
          <path {...s} d="M32 62c4-4 8 4 12 0" />
        </svg>
      );
  }
}

/** photos: fotos de propiedades de la cartera (nunca de banco de imágenes). Si faltan, la tarjeta usa fondo carbón. */
export function ProcessCarousel({ steps, photos = [] }: { steps: ProcessStep[]; photos?: string[] }) {
  const track = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const fromScroll = Math.min(steps.length - 1, Math.round(el.scrollLeft / (card.offsetWidth + 20)));
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      // Al final del recorrido las últimas tarjetas ya están a la vista: se respeta el paso elegido con las flechas.
      setActive((cur) => (atEnd && cur > fromScroll ? cur : fromScroll));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [steps.length]);

  const go = (i: number) => {
    const to = Math.max(0, Math.min(steps.length - 1, i));
    const el = track.current;
    const card = el?.children[to] as HTMLElement | undefined;
    setActive(to);
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Paso <span className="font-semibold text-ink">{active + 1}</span> de {steps.length}: {steps[active]?.title}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Paso anterior" className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-line transition hover:bg-paper disabled:opacity-30">
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...s} d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" onClick={() => go(active + 1)} disabled={active === steps.length - 1} aria-label="Paso siguiente" className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-line transition hover:bg-paper disabled:opacity-30">
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path {...s} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <ol ref={track} className="mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((step, i) => (
          <li key={step.title} className="flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-[10px] border border-line bg-white sm:w-[46%] lg:w-[31.5%]">
            <div className="relative h-52 overflow-hidden bg-coal">
              {photos.length > 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[i % photos.length]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
              <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">Paso {i + 1} de {steps.length}</span>
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                <span className="grid h-16 w-20 shrink-0 place-items-center rounded-[10px] bg-white p-2 text-brand-dark">
                  <Drawing title={step.title} />
                </span>
                <h3 className="pb-1 text-xl font-semibold leading-tight text-white">{step.title}</h3>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <ul className="space-y-2 text-sm leading-relaxed text-text">
                {step.tasks.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark"><path {...s} strokeWidth={2.4} d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                {/* Mismo alto en todas las tarjetas, aunque el texto sea más corto. */}
                <div className="flex h-32 flex-col rounded-[10px] bg-coal px-4 py-3 text-sm text-white">
                  <p className="text-xs font-semibold text-on-dark-muted">Tecnología</p>
                  <p className="mt-1 line-clamp-3 leading-snug">{step.tech}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-2 flex justify-center gap-2">
        {steps.map((step, i) => (
          <button key={step.title} type="button" onClick={() => go(i)} aria-label={`Ir al paso ${i + 1}: ${step.title}`} aria-current={i === active ? "step" : undefined} className="grid h-6 place-items-center px-1">
            <span className={`block h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-brand-dark" : "w-3 bg-line-strong"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
