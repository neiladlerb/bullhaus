"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BROCHURE_BADGES,
  BROCHURE_MAX_PHOTOS,
  BROCHURE_SECTION_LABELS,
  BROCHURE_TEMPLATE_LABELS,
  BROCHURE_TEMPLATES,
  designChanged,
  SECTIONS_BY_KIND,
  type BrochureDesign,
  type BrochureSection,
} from "@bullhaus/core";
import { saveDesignAction } from "../../actions";

type Photo = { id: string; thumb: string };

/** Editor del brochure: controles a la izquierda y, a la derecha, el brochure real con el diseño sin guardar. */
export function Designer({
  id,
  token,
  kind,
  initial,
  photos,
  approved,
}: {
  id: string;
  token: string;
  kind: "venta" | "arriendo" | "captacion";
  initial: BrochureDesign;
  photos: Photo[];
  approved: boolean;
}) {
  const [design, setDesign] = useState<BrochureDesign>(initial);
  const [device, setDevice] = useState<"celular" | "escritorio">("celular");
  const [src, setSrc] = useState(() => previewSrc(token, initial));
  const dirty = useMemo(() => designChanged(initial, design), [initial, design]);

  // La vista previa se recarga medio segundo después del último cambio, no con cada clic.
  useEffect(() => {
    const t = setTimeout(() => setSrc(previewSrc(token, design)), 500);
    return () => clearTimeout(t);
  }, [token, design]);

  const set = (patch: Partial<BrochureDesign>) => setDesign((d) => ({ ...d, ...patch }));
  const togglePhoto = (pid: string) =>
    setDesign((d) => {
      const base = d.photoIds.length ? d.photoIds : [];
      if (base.includes(pid)) return { ...d, photoIds: base.filter((x) => x !== pid) };
      if (base.length >= BROCHURE_MAX_PHOTOS) return d;
      return { ...d, photoIds: [...base, pid] };
    });
  const toggleSection = (s: BrochureSection) => setDesign((d) => ({ ...d, hidden: d.hidden.includes(s) ? d.hidden.filter((x) => x !== s) : [...d.hidden, s] }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
      <form action={saveDesignAction} className="card space-y-6 p-5">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="design" value={JSON.stringify(design)} />

        <fieldset>
          <legend className="label">Plantilla</legend>
          <div className="mt-2 grid gap-2">
            {BROCHURE_TEMPLATES.map((t) => (
              <label key={t} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${design.template === t ? "border-brand-dark bg-paper" : "border-line"}`}>
                <input type="radio" name="template-ui" checked={design.template === t} onChange={() => set({ template: t })} className="mt-1" />
                <span>
                  <span className="block font-medium">{BROCHURE_TEMPLATE_LABELS[t].name}</span>
                  <span className="block text-sm text-muted">{BROCHURE_TEMPLATE_LABELS[t].hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="ds-badge">Etiqueta sobre el título</label>
          <select id="ds-badge" className="input" value={design.badge} onChange={(e) => set({ badge: e.target.value as BrochureDesign["badge"] })}>
            {BROCHURE_BADGES.map((b) => (
              <option key={b} value={b}>{b || "Sin etiqueta"}</option>
            ))}
          </select>
        </div>

        {photos.length > 0 && (
          <fieldset>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="label mb-0">Fotos</legend>
              {design.photoIds.length > 0 && (
                <button type="button" className="text-sm underline" onClick={() => set({ photoIds: [] })}>Usar las de la ficha</button>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {design.photoIds.length
                ? `Elegiste ${design.photoIds.length}. El número es el orden; la 1 es la portada.`
                : `Toca las fotos en el orden que quieras (máximo ${BROCHURE_MAX_PHOTOS}). Sin elegir, van las de la ficha.`}
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.map((ph) => {
                const n = design.photoIds.indexOf(ph.id);
                return (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() => togglePhoto(ph.id)}
                    aria-pressed={n >= 0}
                    aria-label={n >= 0 ? `Quitar foto ${n + 1}` : "Agregar foto"}
                    className={`relative overflow-hidden rounded-md border-2 ${n >= 0 ? "border-brand-dark" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.thumb} alt="" className="aspect-square w-full object-cover" />
                    {n >= 0 && <span className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-brand-dark text-xs font-semibold text-white">{n + 1}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="label">Secciones</legend>
          <div className="mt-2 space-y-1">
            {SECTIONS_BY_KIND[kind].map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={!design.hidden.includes(s)} onChange={() => toggleSection(s)} className="size-5" />
                {BROCHURE_SECTION_LABELS[s]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted">El contacto y el formulario van siempre.</p>
        </fieldset>

        <div className="border-t border-line pt-4">
          <button type="submit" className="btn-primary w-full" disabled={!dirty}>
            {dirty ? (approved ? "Guardar diseño (vuelve a revisión)" : "Guardar diseño") : "Sin cambios"}
          </button>
          {dirty && (
            <button type="button" className="btn-ghost mt-2 w-full" onClick={() => setDesign(initial)}>Descartar cambios</button>
          )}
        </div>
      </form>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Vista previa{dirty ? " (sin guardar)" : ""}</h2>
          <div className="flex gap-2" role="group" aria-label="Tamaño de pantalla">
            {(["celular", "escritorio"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} className={device === d ? "btn-primary" : "btn-ghost"}>
                {d === "celular" ? "Celular" : "Escritorio"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-center overflow-hidden rounded-lg bg-paper p-4">
          {device === "celular" ? (
            <iframe title="Vista previa del brochure en celular" src={src} className="h-[740px] w-[390px] max-w-full rounded-[28px] border-8 border-ink bg-white" />
          ) : (
            <div className="h-[675px] w-[720px] max-w-full overflow-hidden rounded-md border border-line bg-white">
              <iframe title="Vista previa del brochure en escritorio" src={src} className="h-[1125px] w-[1200px] origin-top-left scale-[0.6]" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function previewSrc(token: string, design: BrochureDesign) {
  return `/b/${token}?d=${encodeURIComponent(JSON.stringify(design))}`;
}
