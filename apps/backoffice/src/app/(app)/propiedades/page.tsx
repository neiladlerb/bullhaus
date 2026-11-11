import Link from "next/link";
import { can, formatPrice, PROPERTY_STATUSES, seesOnlyOwnProperties, STATUS_LABELS, TYPE_LABELS } from "@bullhaus/core";
import { requireUser } from "@/lib/auth";
import { activeBrokers, listProperties } from "@/lib/properties";
import { StatusChip } from "@/components/status-chip";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.read");
  const sp = await searchParams;
  const [properties, brokers] = await Promise.all([
    listProperties(user, { q: sp.q, operation: sp.operation, status: sp.status, brokerId: sp.broker }),
    seesOnlyOwnProperties(user.role) ? Promise.resolve([]) : activeBrokers(user.tenantId),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Propiedades</h1>
          <p className="mt-1 text-sm text-muted">{properties.length} resultado{properties.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          {can(user.role, "properties.import") && <Link href="/propiedades/importar" className="btn-ghost">Importar planilla</Link>}
          {can(user.role, "properties.write") && <Link href="/propiedades/nueva" className="btn-brand">Nueva propiedad</Link>}
        </div>
      </div>

      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Código, comuna o sector" className="input lg:col-span-2" />
        <select name="operation" defaultValue={sp.operation ?? ""} className="input">
          <option value="">Venta y arriendo</option>
          <option value="venta">Venta</option>
          <option value="arriendo">Arriendo</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input">
          <option value="">Todos los estados</option>
          {PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {brokers.length > 0 ? (
          <select name="broker" defaultValue={sp.broker ?? ""} className="input">
            <option value="">Todos los corredores</option>
            {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ) : <span />}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button className="btn-primary">Filtrar</button>
          <Link href="/propiedades" className="btn-ghost">Limpiar</Link>
        </div>
      </form>

      {properties.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-muted">
          No hay propiedades con estos filtros.
          {can(user.role, "properties.import") && (
            <> Puedes <Link href="/propiedades/importar" className="text-ink underline">importar la planilla</Link> de Bull Haus.</>
          )}
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Propiedad</th>
                <th className="px-4 py-3 font-medium">Operación</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium">Dorm. / Baños</th>
                <th className="px-4 py-3 font-medium">Corredor</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Web</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {properties.map((p) => {
                const cover = p.media[0]?.sizes as Record<string, string> | undefined;
                return (
                  <tr key={p.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link href={`/propiedades/${p.id}`} className="flex items-center gap-3">
                        {cover?.sm ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/media/${cover.sm}`} alt="" className="h-10 w-14 rounded object-cover" />
                        ) : (
                          <span className="flex h-10 w-14 items-center justify-center rounded bg-paper text-[10px] text-muted">Sin foto</span>
                        )}
                        <span>
                          <span className="block font-medium">{p.code}</span>
                          <span className="text-xs text-muted">{TYPE_LABELS[p.type]} · {p.comuna}{p.sector ? `, ${p.sector}` : ""}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.operation}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatPrice(Number(p.price), p.currency)}</td>
                    <td className="px-4 py-3 tabular-nums">{p.bedrooms ?? "–"} / {p.bathrooms ?? "–"}</td>
                    <td className="px-4 py-3">{p.broker.name}</td>
                    <td className="px-4 py-3"><StatusChip status={p.status} /></td>
                    <td className="px-4 py-3 text-xs">{p.publishWeb ? "Sí" : "No"}</td>
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
