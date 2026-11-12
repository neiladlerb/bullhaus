import type { Metadata } from "next";
import Link from "next/link";
import { TYPE_LABELS } from "@bullhaus/core";
import { Header, PropertyCard } from "@/components/site";
import { filterProperties, getProperties, type Filters } from "@/lib/api";

export const revalidate = 300;
export const metadata: Metadata = { title: "Propiedades en venta y arriendo" };

export default async function Propiedades({ searchParams }: { searchParams: Promise<Filters> }) {
  const f = await searchParams;
  const all = await getProperties();
  const list = filterProperties(all, f);
  const scoped = filterProperties(all, { operacion: f.operacion });
  const comunas = [...new Set(scoped.map((p) => p.comuna))].sort((a, b) => a.localeCompare(b, "es"));
  const types = [...new Set(scoped.map((p) => p.type))];
  const title = f.operacion === "arriendo" ? "Propiedades en arriendo" : f.operacion === "venta" ? "Propiedades en venta" : "Todas las propiedades";

  return (
    <>
      <Header />
      <main className="wrap py-10">
        <h1 className="text-3xl font-light md:text-4xl">{title}</h1>
        <p className="mt-1 text-muted">
          {list.length} {list.length === 1 ? "propiedad" : "propiedades"}
          {f.zona === "costa" ? " en la V Región costa" : f.zona === "santiago" ? " en Santiago" : ""}
        </p>

        <form className="mt-6 grid gap-2 rounded-2xl bg-sand p-3 sm:grid-cols-3 lg:grid-cols-6">
          <select name="operacion" defaultValue={f.operacion ?? ""} className="field" aria-label="Operación">
            <option value="">Venta y arriendo</option>
            <option value="venta">Venta</option>
            <option value="arriendo">Arriendo</option>
          </select>
          <select name="tipo" defaultValue={f.tipo ?? ""} className="field" aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select name="comuna" defaultValue={f.comuna ?? ""} className="field" aria-label="Comuna">
            <option value="">Todas las comunas</option>
            {comunas.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="dormitorios" defaultValue={f.dormitorios ?? ""} className="field" aria-label="Dormitorios">
            <option value="">Dormitorios</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+ dormitorios
              </option>
            ))}
          </select>
          <select name="orden" defaultValue={f.orden ?? ""} className="field" aria-label="Orden">
            <option value="">Más recientes</option>
            <option value="precio-asc">Menor precio</option>
            <option value="precio-desc">Mayor precio</option>
          </select>
          {f.zona && <input type="hidden" name="zona" value={f.zona} />}
          <button className="btn-dark rounded-lg">Filtrar</button>
        </form>

        {list.length ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <PropertyCard key={p.code} p={p} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl bg-sand p-10 text-center">
            <p className="text-lg">No encontramos propiedades con esos filtros.</p>
            <p className="mt-1 text-muted">Cuéntanos qué buscas y te avisamos cuando tengamos algo para ti.</p>
            <Link href="/#contacto" className="btn-brand mt-5">
              Contactar a un corredor
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
