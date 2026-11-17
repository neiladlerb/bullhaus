import Link from "next/link";
import { CURRENCIES, OPERATIONS, PROPERTY_TYPES, TYPE_LABELS } from "@bullhaus/core";
import { requireUser } from "@/lib/auth";
import { getProperty, listProperties } from "@/lib/properties";
import { createValuationAction } from "../actions";

const n = (d: { toString(): string } | null | undefined) => (d === null || d === undefined ? "" : String(Number(d.toString())));

export default async function NuevaTasacionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.write");
  const sp = await searchParams;
  const [properties, p] = await Promise.all([listProperties(user, {}), sp.propiedad ? getProperty(user, sp.propiedad) : null]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/tasaciones" className="text-sm text-muted hover:underline">← Tasaciones</Link>
        <h1 className="mt-2 text-2xl font-semibold">Nueva tasación</h1>
        <p className="mt-1 text-sm text-muted">
          Parte de una propiedad de la cartera o escribe los datos de una que quieres captar. Con la comuna, el tipo y la superficie se buscan comparables en las operaciones cerradas y la cartera de Bull Haus; después puedes sumar avisos de portales.
        </p>
      </div>

      {sp.error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger" role="alert">{sp.error}</p>}

      <form method="get" className="card flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-60 flex-1">
          <label className="label" htmlFor="tz-prop">Completar con una propiedad de la cartera</label>
          <select id="tz-prop" name="propiedad" className="input" defaultValue={p?.id ?? ""}>
            <option value="">Propiedad nueva, sin ficha</option>
            {properties.map((x) => (
              <option key={x.id} value={x.id}>{x.code}, {x.comuna}{x.sector ? `, ${x.sector}` : ""}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-ghost">Completar</button>
      </form>

      <form action={createValuationAction} className="card grid gap-4 p-5 sm:grid-cols-2">
        {p && <input type="hidden" name="propertyId" value={p.id} />}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tz-for">Preparada para (opcional)</label>
          <input id="tz-for" name="preparedFor" className="input" maxLength={120} placeholder="Nombre del propietario" />
        </div>
        <div>
          <label className="label" htmlFor="tz-op">Operación</label>
          <select id="tz-op" name="operation" className="input" defaultValue={p?.operation ?? "venta"}>
            {OPERATIONS.map((o) => <option key={o} value={o}>{o === "venta" ? "Venta" : "Arriendo"}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tz-type">Tipo</label>
          <select id="tz-type" name="type" className="input" defaultValue={p?.type ?? "casa"}>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tz-comuna">Comuna</label>
          <input id="tz-comuna" name="comuna" required className="input" defaultValue={p?.comuna ?? ""} placeholder="Las Condes" />
        </div>
        <div>
          <label className="label" htmlFor="tz-sector">Sector o barrio</label>
          <input id="tz-sector" name="sector" className="input" defaultValue={p?.sector ?? ""} placeholder="Los Dominicos" />
        </div>
        <div>
          <label className="label" htmlFor="tz-cur">Moneda</label>
          <select id="tz-cur" name="currency" className="input" defaultValue={p?.currency ?? "UF"}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c === "UF" ? "UF" : "Pesos"}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tz-m2">Superficie útil (m²)</label>
          <input id="tz-m2" name="m2Useful" inputMode="decimal" className="input" defaultValue={n(p?.m2Useful)} />
        </div>
        <div>
          <label className="label" htmlFor="tz-land">Terreno (m²)</label>
          <input id="tz-land" name="m2Land" inputMode="decimal" className="input" defaultValue={n(p?.m2Land)} />
        </div>
        <div>
          <label className="label" htmlFor="tz-bed">Dormitorios</label>
          <input id="tz-bed" name="bedrooms" inputMode="numeric" className="input" defaultValue={p?.bedrooms ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="tz-bath">Baños</label>
          <input id="tz-bath" name="bathrooms" inputMode="numeric" className="input" defaultValue={p?.bathrooms ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="tz-park">Estacionamientos</label>
          <input id="tz-park" name="parking" inputMode="numeric" className="input" defaultValue={p?.parking ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tz-notes">Comentario para el informe (opcional)</label>
          <textarea id="tz-notes" name="notes" rows={3} maxLength={2000} className="input" placeholder="Estado de conservación, remodelaciones, vista, lo que justifique estar arriba o abajo del rango." />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary min-h-12 w-full sm:w-auto">Buscar comparables</button>
        </div>
      </form>
    </div>
  );
}
