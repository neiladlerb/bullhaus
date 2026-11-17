"use client";
// Menú del back office (skill diseno-bullhaus, backoffice.md, Menú): enlaces agrupados por área de trabajo,
// todos del mismo alto (44 px), y la página actual marcada con aria-current, fondo y barra blanca a la
// izquierda (el magenta no se lee sobre ink: 2,65). También se marca en las subpáginas.
// En el celular el menú completo se abre con el botón "Menú" en vez de una fila con scroll hacia el lado.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export interface NavLink {
  href: string;
  label: string;
}
export interface NavGroup {
  title: string | null;
  links: NavLink[];
}

/** El enlace más largo que calza con la ruta gana: en /propiedades/importar se marca Importar, no Propiedades. */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((h) => (h === "/" ? pathname === "/" : pathname === h || pathname.startsWith(`${h}/`)));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

function Links({ groups, current }: { groups: NavGroup[]; current: string | null }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.title ?? "inicio"} className="mt-3 first:mt-0">
          {g.title && <p className="px-3 pb-1 text-xs font-semibold text-white/70">{g.title}</p>}
          <ul>
            {g.links.map((l) => {
              const on = l.href === current;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex h-11 items-center rounded-md px-3 text-sm transition-colors ${
                      on ? "bg-white/12 font-semibold text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white" : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

export function BackofficeNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const current = activeHref(pathname, groups.flatMap((g) => g.links.map((l) => l.href)));
  const details = useRef<HTMLDetailsElement>(null);
  const currentLabel = groups.flatMap((g) => g.links).find((l) => l.href === current)?.label;

  // Al navegar desde el menú del celular, se cierra.
  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  return (
    <>
      <nav aria-label="Menú principal" className="hidden flex-1 overflow-y-auto px-3 pb-3 md:block">
        <Links groups={groups} current={current} />
      </nav>
      <details ref={details} className="border-t border-white/10 px-3 py-2 md:hidden">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-md px-3 text-sm font-semibold hover:bg-white/10">
          <span>Menú{currentLabel ? <span className="font-normal text-white/70">: {currentLabel}</span> : null}</span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </summary>
        <nav aria-label="Menú principal" className="pb-2 pt-2">
          <Links groups={groups} current={current} />
        </nav>
      </details>
    </>
  );
}
