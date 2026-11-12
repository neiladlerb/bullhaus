"use client";
// Calculadora de UF en un panel lateral: pestaña fija en el borde derecho, se abre con un
// clic (o Alt+U) y convierte UF ⇄ pesos con el valor del día. Es una ayuda referencial:
// los precios de las fichas siguen publicados en su moneda.
import { useEffect, useRef, useState } from "react";
import { clpToUf, parseChileanNumber, ufToClp, type UfValue } from "@bullhaus/core";

const fmtClp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const fmtUf = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

export function UfCalculator({ uf }: { uf: UfValue | null }) {
  const [open, setOpen] = useState(false);
  const [ufText, setUfText] = useState("1");
  const [clpText, setClpText] = useState(uf ? fmtClp(uf.value) : "");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.altKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) first.current?.select();
  }, [open]);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="uf-panel"
        title="Calculadora de UF (Alt+U)"
        className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl bg-brand px-2 py-3 text-xs font-bold tracking-wider text-white shadow-lg transition hover:pr-3 ${open ? "hidden" : ""}`}
        style={{ writingMode: "vertical-rl" }}
      >
        UF {uf ? `$${Math.round(uf.value).toLocaleString("es-CL")}` : ""} · Calcular
      </button>

      <aside
        id="uf-panel"
        aria-label="Calculadora de UF"
        aria-hidden={!open}
        className={`fixed right-0 top-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] -translate-y-1/2 rounded-l-2xl border border-r-0 border-black/10 bg-white p-5 text-[#2f2f2e] shadow-2xl ${open ? "" : "hidden"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Calculadora de UF</p>
            <p className="mt-0.5 text-xs text-[#6b6f74]">
              {uf ? (
                <>
                  UF del {fmtDate(uf.date)}: <strong className="text-[#2f2f2e]">${uf.value.toLocaleString("es-CL", { minimumFractionDigits: 2 })}</strong>
                </>
              ) : (
                "Valor de la UF no disponible en este momento"
              )}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full px-2 text-lg leading-none text-[#6b6f74] hover:bg-black/5" aria-label="Cerrar calculadora" tabIndex={open ? 0 : -1}>
            ×
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-[#6b6f74]">UF</span>
          <input
            ref={first}
            inputMode="decimal"
            value={ufText}
            onChange={(e) => fromUf(e.target.value)}
            disabled={!uf}
            tabIndex={open ? 0 : -1}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-lg tabular-nums outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </label>
        <p className="my-1 text-center text-[#6b6f74]" aria-hidden="true">
          ⇅
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6b6f74]">Pesos</span>
          <input
            inputMode="numeric"
            value={clpText}
            onChange={(e) => fromClp(e.target.value)}
            disabled={!uf}
            tabIndex={open ? 0 : -1}
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-lg tabular-nums outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </label>
        {uf && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[1000, 5000, 10000, 20000].map((n) => (
              <button key={n} type="button" tabIndex={open ? 0 : -1} onClick={() => fromUf(n.toLocaleString("es-CL"))} className="rounded-full border border-black/10 px-2.5 py-1 text-xs hover:border-brand">
                UF {n.toLocaleString("es-CL")}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] leading-snug text-[#6b6f74]">Valor referencial publicado por el Banco Central (vía mindicador.cl). Los precios de cada propiedad se mantienen en la moneda de su ficha.</p>
      </aside>
    </>
  );
}
