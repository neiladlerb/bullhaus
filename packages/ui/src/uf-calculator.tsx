"use client";
// Calculadora de UF: un botón en línea (en la ficha junto al precio, en el pie de la web, en el menú del back
// office) que abre un diálogo. Ya no es una pestaña fija en el borde: en el celular tapaba contenido junto al
// botón de WhatsApp y al aviso de cookies (revisión UX 14/11/2026, B5). Es una ayuda referencial: los precios
// de las fichas siguen publicados en su moneda y nunca se convierten en la interfaz.
import { useEffect, useId, useRef, useState } from "react";
import { clpToUf, parseChileanNumber, ufToClp, type UfValue } from "@bullhaus/core";

const fmtClp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const fmtUf = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

export interface UfCalculatorProps {
  uf: UfValue | null;
  /** Texto del botón. Por defecto "Calculadora UF". */
  label?: string;
  /** Monto en UF con que se abre (el precio de la ficha). */
  initialUf?: number;
  /** Clases del botón que abre la calculadora. */
  className?: string;
  /** Atajo Alt+U. Actívalo en una sola instancia por página. */
  shortcut?: boolean;
}

export function UfCalculator({ uf, label = "Calculadora UF", initialUf = 1, className, shortcut = false }: UfCalculatorProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const id = useId();
  const [ufText, setUfText] = useState(fmtUf(initialUf));
  const [clpText, setClpText] = useState(uf ? fmtClp(ufToClp(initialUf, uf.value)) : "");

  const open = () => {
    ref.current?.showModal();
    first.current?.select();
  };

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        if (ref.current?.open) ref.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const fromUf = (text: string) => {
    setUfText(text);
    const n = parseChileanNumber(text);
    if (uf && n !== null) setClpText(fmtClp(ufToClp(n, uf.value)));
    if (text.trim() === "") setClpText("");
  };
  const fromClp = (text: string) => {
    setClpText(text);
    const n = parseChileanNumber(text.replace(/\$/g, ""));
    if (uf && n !== null) setUfText(fmtUf(clpToUf(n, uf.value)));
    if (text.trim() === "") setUfText("");
  };

  const input =
    "min-h-11 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-lg tabular-nums text-ink outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand";

  return (
    <>
      <button type="button" onClick={open} aria-haspopup="dialog" title={shortcut ? "Calculadora de UF (Alt+U)" : undefined} className={className}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-t`}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-[10px] bg-white p-5 text-text shadow-[0_8px_24px_rgb(0_0_0/0.12)] backdrop:bg-black/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p id={`${id}-t`} className="text-base font-semibold text-heading">
              Calculadora de UF
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {uf ? (
                <>
                  UF del {fmtDate(uf.date)}: <strong className="text-ink">${uf.value.toLocaleString("es-CL", { minimumFractionDigits: 2 })}</strong>
                </>
              ) : (
                "Valor de la UF no disponible en este momento"
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-xl leading-none text-muted hover:bg-paper"
            aria-label="Cerrar calculadora"
          >
            ×
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-muted">UF</span>
          <input ref={first} inputMode="decimal" value={ufText} onChange={(e) => fromUf(e.target.value)} disabled={!uf} className={input} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Pesos</span>
          <input inputMode="numeric" value={clpText} onChange={(e) => fromClp(e.target.value)} disabled={!uf} className={input} />
        </label>
        {uf && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[1000, 5000, 10000, 20000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => fromUf(n.toLocaleString("es-CL"))}
                className="min-h-11 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:border-brand-dark sm:min-h-9"
              >
                UF {n.toLocaleString("es-CL")}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs leading-snug text-muted">
          Valor referencial publicado por el Banco Central (vía mindicador.cl). Los precios de cada propiedad se mantienen en la moneda de su ficha.
        </p>
      </dialog>
    </>
  );
}
