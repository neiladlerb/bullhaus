import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COMPARABLE_SOURCE_LABELS,
  comparableProblem,
  comparisonArea,
  CONFIDENCE_LABELS,
  formatDate,
  formatPrice,
  localDayKey,
  perM2,
  TYPE_LABELS,
  usesLandArea,
  valuationResult,
} from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { comparableOf, subjectOf, valuationScope } from "@/lib/valuation";
import { addManualComparableAction, markDeliveredAction, refreshComparablesAction, removeComparableAction, saveNotesAction, toggleComparableAction } from "../actions";

const SOURCE_SHORT = { cierre: "Cierre", cartera: "Cartera", manual: "Portal" } as const;
const CONF_TONE = { alta: "bg-success-soft text-success", media: "bg-warning-soft text-warning", baja: "bg-danger-soft text-danger" } as const;
const fmtM2 = (n: number) => `${n.toLocaleString("es-CL", { maximumFractionDigits: 1 })} m²`;

export default async function TasacionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.write");
  const { id } = await params;
  const sp = await searchParams;
  const v = await prisma.valuation.findFirst({
    where: { id, ...valuationScope(user) },
    include: { comparables: { orderBy: [{ included: "desc" }, { createdAt: "asc" }] }, property: { select: { id: true, code: true } } },
  });
  if (!v) notFound();

  const subject = subjectOf(v);
  const comps = v.comparables.map((c) => ({ row: c, input: comparableOf(c) }));
  const included = comps.filter((c) => c.row.included);
  const result = valuationResult(subject, included.map((c) => c.input));
  const outlierIds = new Set(result.outliers.map((i) => included[i]!.row.id));
  const landArea = usesLandArea(v.type);
  const pm2 = (n: number) => `${formatPrice(n, v.currency)}/m²`;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/tasaciones" className="text-sm text-muted hover:underline">← Tasaciones</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {TYPE_LABELS[v.type]} en {v.operation}, {v.comuna}{v.sector ? `, ${v.sector}` : ""}
          </h1>
          <span className={`chip ${v.status === "entregada" ? "bg-success-soft text-success" : "bg-paper text-muted"}`}>{v.status === "entregada" ? "Entregada" : "Borrador"}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {[
            v.m2Useful && `${fmtM2(Number(v.m2Useful))} útiles`,
            v.m2Land && `${fmtM2(Number(v.m2Land))} de terreno`,
            v.bedrooms !== null && `${v.bedrooms} dormitorios`,
            v.bathrooms !== null && `${v.bathrooms} baños`,
            v.parking !== null && `${v.parking} estacionamientos`,
          ]
            .filter(Boolean)
            .join(", ")}
          . {v.property ? <Link href={`/propiedades/${v.property.id}`} className="underline">{v.property.code}</Link> : "Sin ficha en la cartera"}. Creada el {formatDate(v.createdAt)}.
        </p>
      </div>

      {sp.error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger" role="alert">{sp.error}</p>}
      {sp.ok && <p className="rounded-lg bg-success-soft p-3 text-sm text-success" role="status">{sp.ok}</p>}

      <section className="card grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
        {result.value && result.perM2 ? (
          <div>
            <p className="text-sm text-muted">Valor sugerido</p>
            <p className="text-3xl font-semibold">{formatPrice(result.value.point, v.currency)}</p>
            <p className="mt-1">
              Rango {formatPrice(result.value.low, v.currency)} a {formatPrice(result.value.high, v.currency)}
            </p>
            <p className="mt-2 text-sm text-muted">
              Mediana {pm2(result.perM2.median)} {landArea ? "de terreno" : "útil"} (entre {pm2(result.perM2.p25)} y {pm2(result.perM2.p75)}), con {result.count} comparables, {result.closings} de ellos cierres.
              {result.closings < result.count && " Los precios publicados suelen quedar sobre el precio de cierre."}
            </p>
          </div>
        ) : (
          <p className="text-muted">
            Sin comparables suficientes para un valor. Busca de nuevo en la data de Bull Haus o agrega avisos de portales abajo.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <span className={`chip ${CONF_TONE[result.confidence]}`}>Confianza {CONFIDENCE_LABELS[result.confidence].toLowerCase()}</span>
          <Link href={`/informe-tasacion/${v.id}`} className="btn-primary text-center">Ver informe para el cliente</Link>
          <form action={markDeliveredAction}>
            <input type="hidden" name="valuationId" value={v.id} />
            <button type="submit" className="btn-ghost w-full">{v.status === "entregada" ? "Volver a borrador" : "Marcar como entregada"}</button>
          </form>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Comparables ({included.length} de {comps.length} en el cálculo)</h2>
          <form action={refreshComparablesAction}>
            <input type="hidden" name="valuationId" value={v.id} />
            <button type="submit" className="btn-ghost">Buscar de nuevo en Bull Haus</button>
          </form>
        </div>
        <p className="mt-1 text-sm text-muted">
          Misma operación, tipo, moneda y comuna, con superficie entre 60 % y 160 % de la tasada; primero los del mismo sector. Saca del cálculo los que no se parezcan de verdad (estado, vista, edificio).
        </p>
        {comps.length === 0 ? (
          <p className="mt-4 text-muted">No hay comparables todavía.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="p-2 font-medium">En el cálculo</th>
                  <th className="p-2 font-medium">Comparable</th>
                  <th className="p-2 font-medium">Sector</th>
                  <th className="p-2 font-medium">{landArea ? "Terreno" : "Útil"}</th>
                  <th className="p-2 font-medium">D / B</th>
                  <th className="p-2 font-medium">Precio</th>
                  <th className="p-2 font-medium">Por m²</th>
                  <th className="p-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comps.map(({ row: c, input }) => {
                  const problem = comparableProblem(subject, input);
                  const area = comparisonArea(input);
                  const value = perM2(input);
                  return (
                    <tr key={c.id} className={c.included ? "" : "text-muted"}>
                      <td className="p-2">
                        <form action={toggleComparableAction}>
                          <input type="hidden" name="valuationId" value={v.id} />
                          <input type="hidden" name="comparableId" value={c.id} />
                          <button type="submit" className="btn-ghost w-24" aria-label={`${c.included ? "Sacar" : "Incluir"} ${c.label}`}>{c.included ? "Sacar" : "Incluir"}</button>
                        </form>
                      </td>
                      <td className="p-2">
                        {c.source === "manual" && c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline">{c.label}</a>
                        ) : c.propertyId ? (
                          <Link href={`/propiedades/${c.propertyId}`} className="underline">{c.label}</Link>
                        ) : (
                          c.label
                        )}
                        <span className="block text-xs text-muted" title={COMPARABLE_SOURCE_LABELS[c.source]}>{SOURCE_SHORT[c.source]}</span>
                        {problem && <span className="chip mt-1 bg-paper text-muted">{problem}</span>}
                        {outlierIds.has(c.id) && <span className="chip mt-1 bg-warning-soft text-warning">Atípico</span>}
                        {c.source === "manual" && (
                          <form action={removeComparableAction} className="mt-1">
                            <input type="hidden" name="valuationId" value={v.id} />
                            <input type="hidden" name="comparableId" value={c.id} />
                            <button type="submit" className="text-xs text-danger underline">Eliminar aviso</button>
                          </form>
                        )}
                      </td>
                      <td className="p-2">{c.sector ?? ""}</td>
                      <td className="p-2">{area ? fmtM2(area) : ""}</td>
                      <td className="p-2">{c.bedrooms ?? "?"} / {c.bathrooms ?? "?"}</td>
                      <td className="p-2">{formatPrice(Number(c.price), c.currency)}</td>
                      <td className="p-2">{value ? pm2(value) : ""}</td>
                      <td className="p-2">{c.observedAt ? formatDate(c.observedAt) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="card p-5" open={sp.aviso === "1"}>
        <summary className="cursor-pointer font-semibold">Agregar un aviso de portal</summary>
        <p className="mt-2 text-sm text-muted">
          Copia los datos de un aviso parecido que viste en Portal Inmobiliario, TocToc u otro portal, con su enlace. Queda como {v.operation} de {TYPE_LABELS[v.type].toLowerCase()} en {v.comuna}, en {v.currency === "UF" ? "UF" : "pesos"}.
        </p>
        <form action={addManualComparableAction} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="valuationId" value={v.id} />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="mc-label">Título</label>
            <input id="mc-label" name="label" required maxLength={120} className="input" placeholder="Casa 4D 3B Los Dominicos" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="mc-url">Enlace del aviso</label>
            <input id="mc-url" name="url" type="url" className="input" placeholder="https://" />
          </div>
          <div>
            <label className="label" htmlFor="mc-price">Precio ({v.currency === "UF" ? "UF" : "$"})</label>
            <input id="mc-price" name="price" required inputMode="decimal" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="mc-m2">{landArea ? "Terreno (m²)" : "Superficie útil (m²)"}</label>
            <input id="mc-m2" name={landArea ? "m2Land" : "m2Useful"} required inputMode="decimal" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="mc-bed">Dormitorios</label>
            <input id="mc-bed" name="bedrooms" inputMode="numeric" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="mc-bath">Baños</label>
            <input id="mc-bath" name="bathrooms" inputMode="numeric" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="mc-sector">Sector</label>
            <input id="mc-sector" name="sector" className="input" defaultValue={v.sector ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="mc-date">Visto el</label>
            <input id="mc-date" name="observedAt" type="date" required className="input" defaultValue={localDayKey(new Date())} />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button type="submit" className="btn-brand w-full sm:w-auto">Agregar comparable</button>
          </div>
        </form>
      </details>

      <section className="card p-5">
        <h2 className="font-semibold">Texto del informe</h2>
        <form action={saveNotesAction} className="mt-3 grid gap-4">
          <input type="hidden" name="valuationId" value={v.id} />
          <div>
            <label className="label" htmlFor="vn-for">Preparada para</label>
            <input id="vn-for" name="preparedFor" maxLength={120} className="input" defaultValue={v.preparedFor ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="vn-notes">Comentario del corredor</label>
            <textarea id="vn-notes" name="notes" rows={4} maxLength={2000} className="input" defaultValue={v.notes ?? ""} placeholder="Por qué recomiendas publicar en la parte alta o baja del rango." />
          </div>
          <div>
            <button type="submit" className="btn-ghost">Guardar</button>
          </div>
        </form>
      </section>
    </div>
  );
}
