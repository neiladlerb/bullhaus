import Link from "next/link";
import { formatPrice, PRICE_FLAG_LABELS, PRICE_THRESHOLD, reviewPrices, seesOnlyOwnProperties, TYPE_LABELS, type PriceFlag } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";

const FLAG_CHIP: Record<PriceFlag, string> = {
  sobre: "bg-amber-100 text-amber-900",
  bajo: "bg-sky-100 text-sky-900",
  pack: "bg-violet-100 text-violet-900",
  sin_m2: "bg-paper text-muted",
};

const pct = (d: number) => `${d > 0 ? "+" : ""}${Math.round(d * 100)} %`;

export default async function PreciosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.read");
  const sp = await searchParams;
  // Las medianas usan toda la cartera disponible del tenant; el corredor ve solo sus filas.
  const all = await prisma.property.findMany({
    where: { tenantId: user.tenantId, status: "disponible" },
    select: { id: true, code: true, operation: true, type: true, comuna: true, price: true, currency: true, m2Useful: true, headline: true, description: true, brokerId: true, broker: { select: { name: true } } },
    orderBy: [{ operation: "asc" }, { type: "asc" }, { comuna: "asc" }],
  });
  const reviews = new Map(
    reviewPrices(all.map((p) => ({ ...p, price: Number(p.price), m2Useful: p.m2Useful ? Number(p.m2Useful) : null }))).map((r) => [r.id, r]),
  );
  const own = seesOnlyOwnProperties(user.role);
  const rows = all
    .filter((p) => !own || p.brokerId === user.id)
    .map((p) => ({ p, r: reviews.get(p.id)! }))
    .filter(({ r }) => sp.todas || r.flags.some((f) => f !== "sin_m2"));
  const flagged = [...reviews.values()].filter((r) => r.flags.some((f) => f !== "sin_m2")).length;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/propiedades" className="text-sm text-muted hover:underline">
          ← Propiedades
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Revisión de precios</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Compara el precio por m² útil de cada propiedad disponible con la mediana de la cartera de Bull Haus en la misma operación, tipo, moneda y comuna (o de toda la cartera si en la comuna hay menos de 3).
          Marca las que se alejan más de {Math.round(PRICE_THRESHOLD * 100)} % y las que cobran por varias unidades. Es una ayuda para el corredor: no cambia ningún precio.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="chip bg-amber-100 text-amber-900">{flagged} para revisar</span>
        <Link href={sp.todas ? "/propiedades/precios" : "/propiedades/precios?todas=1"} className="btn-ghost">
          {sp.todas ? "Ver solo las marcadas" : "Ver todas"}
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Propiedad</th>
              <th className="font-semibold">Precio</th>
              <th className="font-semibold">m² útiles</th>
              <th className="font-semibold">Por m²</th>
              <th className="font-semibold">Mediana</th>
              <th className="font-semibold">Diferencia</th>
              <th className="pr-4 font-semibold">Revisar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, r }) => (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3">
                  <Link href={`/propiedades/${p.id}`} className="font-medium hover:underline">
                    {p.code} · {TYPE_LABELS[p.type]} en {p.operation}
                  </Link>
                  <span className="block text-xs text-muted">
                    {p.comuna} · {p.broker.name}
                  </span>
                  {p.headline && <span className="block max-w-xs truncate text-xs text-muted">{p.headline}</span>}
                </td>
                <td className="py-3 tabular-nums">{formatPrice(Number(p.price), p.currency)}</td>
                <td className="py-3 tabular-nums">{p.m2Useful ? Number(p.m2Useful).toLocaleString("es-CL") : "—"}</td>
                <td className="py-3 tabular-nums">{r.perM2 !== null ? formatPrice(r.perM2, p.currency) : "—"}</td>
                <td className="py-3 tabular-nums">
                  {r.median !== null ? formatPrice(r.median, p.currency) : "—"}
                  {r.basis && (
                    <span className="block text-xs text-muted">
                      {r.basis}, {r.sample} prop.
                    </span>
                  )}
                </td>
                <td className={`py-3 tabular-nums ${r.deviation !== null && Math.abs(r.deviation) > PRICE_THRESHOLD ? "font-semibold" : ""}`}>{r.deviation !== null ? pct(r.deviation) : "—"}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {r.flags.map((f) => (
                      <span key={f} className={`chip ${FLAG_CHIP[f]}`}>
                        {PRICE_FLAG_LABELS[f]}
                      </span>
                    ))}
                  </div>
                  {r.flags.includes("pack") && <p className="mt-1 text-xs text-muted">La superficie es de una unidad; conviene indicar el total o el precio por unidad en la ficha.</p>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Ninguna propiedad se aleja de la mediana de la cartera.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
