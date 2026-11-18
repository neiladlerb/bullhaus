import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adjustedValue, comparisonArea, CONFIDENCE_LABELS, formatDate, formatPrice, parseAdjustments, perM2, TYPE_LABELS, usesLandArea, valuationResult } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { PrintButton } from "@/app/(app)/contratos/print-button";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { comparableOf, subjectOf, valuationScope } from "@/lib/valuation";

export const metadata: Metadata = { title: "Informe de valor comercial, Bull Haus" };

const fmtM2 = (n: number) => `${n.toLocaleString("es-CL", { maximumFractionDigits: 1 })} m²`;

/**
 * Informe para el propietario. Solo los comparables que el corredor dejó en el cálculo. Los cierres se muestran sin
 * código ni número de operación: el precio de cierre de otro cliente no se identifica ante terceros.
 * Nunca muestra direcciones exactas.
 */
export default async function InformeTasacionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("properties.write");
  const { id } = await params;
  const v = await prisma.valuation.findFirst({ where: { id, ...valuationScope(user) }, include: { comparables: { where: { included: true }, orderBy: { createdAt: "asc" } } } });
  if (!v) notFound();
  const author = await prisma.user.findFirst({ where: { id: v.authorId, tenantId: user.tenantId }, select: { name: true } });

  const subject = subjectOf(v);
  const result = valuationResult(subject, v.comparables.map(comparableOf));
  const landArea = usesLandArea(v.type);
  const adjustments = parseAdjustments(v.adjustments);
  const adjusted = adjustments.length ? adjustedValue(result, adjustments, v.currency) : null;
  const shownValue = adjusted ?? result.value;
  const pm2 = (n: number) => `${formatPrice(n, v.currency)}/m²`;
  const shown = v.comparables
    .map((c) => ({ c, input: comparableOf(c) }))
    .filter(({ input }) => perM2(input) !== null);
  const label = (source: string, raw: string) => (source === "cierre" ? "Operación cerrada por Bull Haus" : source === "cartera" ? `Bull Haus, ${raw}` : raw);
  const sourceText = { cierre: "Precio de cierre", cartera: "Precio publicado", manual: "Precio publicado en portal" } as const;

  return (
    <main className="mx-auto max-w-4xl bg-white p-6 text-ink sm:p-10 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/tasaciones/${v.id}`} className="text-sm text-muted hover:underline">← Volver a la tasación</Link>
        <PrintButton />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <Logo />
        <div className="text-right text-sm">
          <p className="text-lg font-semibold">Opinión de valor comercial</p>
          <p>{formatDate(v.createdAt)}</p>
          {v.preparedFor && <p>Preparada para {v.preparedFor}</p>}
          {author && <p>Corredor: {author.name}</p>}
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">La propiedad</h2>
        <p className="mt-1">
          {TYPE_LABELS[v.type]} en {v.operation} en {v.comuna}{v.sector ? `, sector ${v.sector}` : ""}.{" "}
          {[
            v.m2Useful && `${fmtM2(Number(v.m2Useful))} útiles`,
            v.m2Land && `${fmtM2(Number(v.m2Land))} de terreno`,
            v.bedrooms !== null && `${v.bedrooms} dormitorios`,
            v.bathrooms !== null && `${v.bathrooms} baños`,
            v.parking !== null && `${v.parking} estacionamientos`,
          ]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line p-5">
        {result.value && result.perM2 ? (
          <>
            <p className="text-sm text-muted">Valor comercial estimado</p>
            <p className="text-3xl font-semibold">{formatPrice(shownValue!.point, v.currency)}</p>
            <p className="mt-1">
              Rango de {formatPrice(shownValue!.low, v.currency)} a {formatPrice(shownValue!.high, v.currency)}
            </p>
            <p className="mt-3 text-sm">
              Sale de multiplicar {result.area ? fmtM2(result.area) : ""} {landArea ? "de terreno" : "útiles"} por el valor por m² de {result.count} propiedades comparables: mediana de {pm2(result.perM2.median)}, y la mitad central entre {pm2(result.perM2.p25)} y {pm2(result.perM2.p75)}.
            </p>
            {adjusted && (
              <p className="mt-1 text-sm">
                Según los comparables, {formatPrice(result.value.point, v.currency)}. El corredor lo ajustó en {adjusted.percent > 0 ? "+" : ""}{adjusted.percent.toLocaleString("es-CL")} % por las características de la propiedad que se detallan abajo.
              </p>
            )}
            <p className="mt-1 text-sm text-muted">Confianza {CONFIDENCE_LABELS[result.confidence].toLowerCase()}.</p>
          </>
        ) : (
          <p>No hay comparables suficientes para estimar un valor.</p>
        )}
      </section>

      {adjustments.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-lg font-semibold">Ajustes por características de la propiedad</h2>
          <table className="mt-2 w-full text-sm">
            <tbody className="divide-y divide-line">
              {adjustments.map((a, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 font-medium">{a.label}</td>
                  <td className="py-2 pr-3">{a.note}</td>
                  <td className="py-2 text-right tabular-nums">{a.percent > 0 ? "+" : ""}{a.percent.toLocaleString("es-CL")} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {v.notes && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Comentario del corredor</h2>
          <p className="mt-1 whitespace-pre-line">{v.notes}</p>
        </section>
      )}

      {shown.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-lg font-semibold">Propiedades comparables</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="border-b border-line text-left">
              <tr>
                <th className="py-2 pr-2 font-medium">Propiedad</th>
                <th className="py-2 pr-2 font-medium">Sector</th>
                <th className="py-2 pr-2 font-medium">{landArea ? "Terreno" : "Útil"}</th>
                <th className="py-2 pr-2 font-medium">D / B</th>
                <th className="py-2 pr-2 font-medium">Precio</th>
                <th className="py-2 pr-2 font-medium">Por m²</th>
                <th className="py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map(({ c, input }) => (
                <tr key={c.id}>
                  <td className="py-2 pr-2">
                    {label(c.source, c.label)}
                    <span className="block text-xs text-muted">{sourceText[c.source]}</span>
                  </td>
                  <td className="py-2 pr-2">{c.sector ?? ""}</td>
                  <td className="py-2 pr-2">{fmtM2(comparisonArea(input)!)}</td>
                  <td className="py-2 pr-2">{c.bedrooms ?? "?"} / {c.bathrooms ?? "?"}</td>
                  <td className="py-2 pr-2">{formatPrice(Number(c.price), c.currency)}</td>
                  <td className="py-2 pr-2">{pm2(perM2(input)!)}</td>
                  <td className="py-2">{c.observedAt ? formatDate(c.observedAt) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-8 border-t border-line pt-4 text-xs text-muted">
        <p>
          Cómo se calculó: se eligieron propiedades de la misma comuna, tipo y operación, con superficie parecida, dando prioridad al mismo sector y a las operaciones cerradas. Los precios publicados suelen quedar sobre el precio final de cierre.
        </p>
        <p className="mt-2">
          Es una opinión comercial de Bull Haus para fijar el precio de publicación. No es una tasación bancaria ni pericial, y no revisa el estado legal, los títulos ni la construcción de la propiedad.
        </p>
      </section>
    </main>
  );
}
