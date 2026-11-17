import Link from "next/link";
import { formatDate, formatPrice, TYPE_LABELS, valuationResult } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { comparableOf, subjectOf, valuationScope } from "@/lib/valuation";

export default async function TasacionesPage() {
  const user = await requireUser("properties.write");
  const rows = await prisma.valuation.findMany({
    where: valuationScope(user),
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { comparables: true, property: { select: { code: true } } },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tasaciones</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Valor comercial por comparables: precio por m² de propiedades parecidas en la misma comuna, con el rango y un informe para el propietario. Sirve para fijar el precio de publicación; no es una tasación bancaria.
          </p>
        </div>
        <Link href="/tasaciones/nueva" className="btn-primary">Nueva tasación</Link>
      </div>

      {rows.length === 0 ? (
        <p className="card p-5 text-muted">Todavía no hay tasaciones.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="p-3 font-medium">Propiedad</th>
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Comparables</th>
                <th className="p-3 font-medium">Valor sugerido</th>
                <th className="p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((v) => {
                const included = v.comparables.filter((c) => c.included).map(comparableOf);
                const r = valuationResult(subjectOf(v), included);
                return (
                  <tr key={v.id}>
                    <td className="p-3">
                      <Link href={`/tasaciones/${v.id}`} className="font-medium hover:underline">
                        {TYPE_LABELS[v.type]} en {v.operation}, {v.comuna}{v.sector ? `, ${v.sector}` : ""}
                      </Link>
                      <span className="block text-muted">{v.property ? v.property.code : "Sin ficha"}{v.preparedFor ? `, para ${v.preparedFor}` : ""}</span>
                    </td>
                    <td className="p-3">{formatDate(v.createdAt)}</td>
                    <td className="p-3">{r.count}</td>
                    <td className="p-3">{r.value ? formatPrice(r.value.point, v.currency) : "Sin datos suficientes"}</td>
                    <td className="p-3">
                      <span className={`chip ${v.status === "entregada" ? "bg-success-soft text-success" : "bg-paper text-muted"}`}>{v.status === "entregada" ? "Entregada" : "Borrador"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
