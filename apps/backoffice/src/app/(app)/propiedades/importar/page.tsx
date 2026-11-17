import Link from "next/link";
import { formatDate, SHEET_COLUMNS, type RowError } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { ImportForm } from "./import-form";

// Orden de lectura de las columnas, por tema. Solo presentación: la validación sigue en SHEET_COLUMNS.
const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Identificación", keys: ["codigo", "operacion", "tipo", "corredor", "estado", "publicar_web"] },
  { title: "Ubicación", keys: ["comuna", "sector", "direccion_exacta"] },
  { title: "Precio", keys: ["precio", "moneda", "gastos_comunes_clp"] },
  { title: "Características", keys: ["m2_utiles", "m2_terreno", "dormitorios", "banos", "estacionamientos", "bodegas", "mascotas", "amoblado", "disponible_desde"] },
  { title: "Textos y anuncios", keys: ["descripcion", "url_instagram", "ids_anuncio"] },
];
const COLUMN_GROUPS = [
  ...GROUPS.map((g) => ({ title: g.title, columns: SHEET_COLUMNS.filter((c) => g.keys.includes(c.key)) })),
  { title: "Otras", columns: SHEET_COLUMNS.filter((c) => !GROUPS.some((g) => g.keys.includes(c.key))) },
].filter((g) => g.columns.length > 0);

// Ayuda para las columnas que en SHEET_COLUMNS no la traen.
const COLUMN_HELP: Record<string, string> = {
  comuna: "Comuna tal como se publica",
  sector: "Barrio o sector, si aplica",
  m2_utiles: "Metros cuadrados útiles, solo el número",
  m2_terreno: "Metros cuadrados de terreno, solo el número",
  dormitorios: "Cantidad",
  banos: "Cantidad",
  estacionamientos: "Cantidad",
  bodegas: "Cantidad",
  url_instagram: "Enlace a la publicación de la propiedad",
};

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.import");
  const sp = await searchParams;
  const [current, recent] = await Promise.all([
    sp.lote ? prisma.importBatch.findFirst({ where: { id: sp.lote, tenantId: user.tenantId } }) : null,
    prisma.importBatch.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const errors = (current?.errors ?? []) as unknown as RowError[];

  return (
    <div className="max-w-5xl">
      <Link href="/propiedades" className="text-sm text-muted hover:underline">← Propiedades</Link>
      <h1 className="mt-2 text-2xl font-semibold">Importar planilla</h1>
      <p className="mt-1 text-sm text-muted">Una fila por propiedad. Si el código ya existe, la fila la actualiza. Las filas con errores no se cargan y se listan abajo.</p>

      {/* Tres pasos en orden, cada uno con su acción: el proceso se entiende sin leer las columnas. */}
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        <li className="card flex flex-col p-5">
          <p className="text-sm font-semibold text-muted">Paso 1</p>
          <h2 className="mt-1 font-semibold">Descarga la planilla modelo</h2>
          <p className="mt-1 flex-1 text-sm text-muted">Excel con los encabezados correctos, una fila de ejemplo y una hoja de instrucciones.</p>
          <a href="/propiedades/plantilla" className="btn-primary mt-4 self-start">Descargar planilla</a>
        </li>
        <li className="card flex flex-col p-5">
          <p className="text-sm font-semibold text-muted">Paso 2</p>
          <h2 className="mt-1 font-semibold">Completa una fila por propiedad</h2>
          <p className="mt-1 flex-1 text-sm text-muted">
            Las columnas marcadas como obligatorias en la tabla de abajo no pueden ir vacías. Si ya tienes tu planilla, copia tus datos debajo de los mismos encabezados. También sirve un .csv.
          </p>
          <a href="#columnas" className="btn-ghost mt-4 self-start">Ver qué va en cada columna</a>
        </li>
        <li className="card flex flex-col p-5">
          <p className="text-sm font-semibold text-muted">Paso 3</p>
          <h2 className="mt-1 font-semibold">Sube el archivo</h2>
          <p className="mt-1 text-sm text-muted">Si el código ya existe, la fila actualiza esa propiedad. Las filas con errores no se cargan y te decimos qué corregir.</p>
          <div className="mt-4">
            <ImportForm />
          </div>
        </li>
      </ol>

      {current && (
        <section className="card mt-6 p-6" aria-live="polite">
          <h2 className="font-medium">Resultado: {current.fileName}</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="chip bg-success-soft text-success">{current.created} creadas</span>
            <span className="chip bg-info-soft text-info">{current.updated} actualizadas</span>
            <span className={`chip ${current.rejected ? "bg-danger-soft text-danger" : "bg-paper text-muted"}`}>{current.rejected} con errores</span>
          </div>
          {errors.length > 0 && (
            <table className="mt-5 w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr><th className="py-2 pr-4 font-medium">Fila</th><th className="py-2 pr-4 font-medium">Código</th><th className="py-2 font-medium">Qué corregir</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {errors.map((e) => (
                  <tr key={e.row}>
                    <td className="py-2 pr-4 tabular-nums">{e.row}</td>
                    <td className="py-2 pr-4">{e.code ?? "–"}</td>
                    <td className="py-2"><ul className="list-disc pl-4">{e.messages.map((m) => <li key={m}>{m}</li>)}</ul></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section id="columnas" className="card mt-6 scroll-mt-6 overflow-hidden">
        <div className="p-6 pb-2">
          <h2 className="font-semibold">Qué va en cada columna</h2>
          <p className="mt-1 text-sm text-muted">El encabezado debe quedar escrito igual que en la primera columna. El orden de las columnas no importa.</p>
        </div>
        {COLUMN_GROUPS.map((g) => (
          <div key={g.title} className="px-6 pb-4">
            <h3 className="mt-4 text-sm font-semibold">{g.title}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-line text-left text-xs text-muted">
                  <tr>
                    <th className="w-48 py-2 pr-4 font-medium">Encabezado</th>
                    <th className="w-28 py-2 pr-4 font-medium">Obligatoria</th>
                    <th className="py-2 pr-4 font-medium">Qué poner</th>
                    <th className="w-44 py-2 font-medium">Ejemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {g.columns.map((c) => (
                    <tr key={c.key}>
                      <td className="py-2 pr-4"><code className="rounded bg-paper px-1.5 py-0.5 text-xs">{c.key}</code></td>
                      <td className="py-2 pr-4">{c.required ? <span className="chip bg-warning-soft text-warning">Obligatoria</span> : <span className="text-muted">Opcional</span>}</td>
                      <td className="py-2 pr-4">{COLUMN_HELP[c.key] ?? c.help}</td>
                      <td className="py-2 text-muted">{c.example || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {recent.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="mb-3 font-medium">Últimas importaciones</h2>
          <ul className="divide-y divide-line text-sm">
            {recent.map((b) => (
              <li key={b.id} className="flex justify-between py-2">
                <Link href={`/propiedades/importar?lote=${b.id}`} className="hover:underline">{b.fileName}</Link>
                <span className="text-muted">{formatDate(b.createdAt)} · {b.created} nuevas · {b.updated} actualizadas · {b.rejected} con errores</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
